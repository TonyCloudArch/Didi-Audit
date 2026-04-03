const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const { parseDidiReport } = require('../services/ai');

// Configuración de Multer para fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 🎬 1. Iniciar Turno (Apertura)
router.post('/shifts/open', async (req, res) => {
  const { initial_odometer, initial_cash } = req.body;
  try {
    const [result] = await db.execute(
      'INSERT INTO shifts (initial_odometer, initial_cash, status) VALUES (?, ?, "OPEN")',
      [initial_odometer, initial_cash]
    );
    res.json({ id: result.insertId, status: 'OPEN' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📸 2. Cargar Imágenes en Lote (Magic Reader Batch)
router.post('/upload/batch', upload.array('images', 60), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).send('No images uploaded');
  
  try {
    // Buscar o auto-crear turno si no hay uno
    const [activeShift] = await db.execute('SELECT id FROM shifts WHERE status = "OPEN" ORDER BY id DESC LIMIT 1');
    let shiftId = activeShift[0]?.id;

    if (!shiftId) {
      const [newShift] = await db.execute('INSERT INTO shifts (initial_odometer, initial_cash, status) VALUES (?, ?, "OPEN")', [195258, 200]);
      shiftId = newShift.insertId;
    }

    let viajesProcesados = 0;
    let fallbackError = null;

    // Procesar en pares (2 fotos por viaje)
    // Si sube 30 fotos, habrán 15 viajes.
    for (let i = 0; i < req.files.length; i += 2) {
      try {
        const paths = [req.files[i].path];
        if (req.files[i+1]) paths.push(req.files[i+1].path);

        // 1. IA extrae datos del par de imágenes
        const aiData = await parseDidiReport(paths);
        
        // 2. Guardar en BD
        await db.execute(
          `INSERT INTO entries (
            shift_id, pasajero, distancia_didi_km, ganancia_bruta, 
            ganancia_antes_impuesto, tarifa_servicio, cuota_solicitud, 
            monto_adicional_gasolina, impuesto_total, ganancia_neta_final, 
            metodo_pago, roi_km, calificacion_seleccion, raw_data_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            shiftId,
            aiData.pasajero || 'App DiDi',
            aiData.distancia_didi_km || 0,
            aiData.ganancia_bruta || 0,
            aiData.ganancia_antes_impuesto || 0,
            aiData.tarifa_servicio || 0,
            aiData.cuota_solicitud || 0,
            aiData.monto_adicional_gasolina || 0,
            aiData.impuesto_total || 0,
            aiData.ganancia_neta_final || 0,
            aiData.metodo_pago || 'Desconocido',
            aiData.roi_km || 0,
            aiData.calificacion_seleccion || '-',
            JSON.stringify(aiData)
          ]
        );
        viajesProcesados++;
      } catch (err) {
        console.error("Error en par iterativo:", err.message);
        fallbackError = err.message; // Guardamos el error pero seguimos o detenemos según severidad
        // Si es 429 Too Many Requests (Rate limit de OpenAI), no tiene sentido seguir
        if(err.message.includes("429") || err.message.includes("Rate limit") || err.message.includes("Insufficient quota")) {
          break;
        }
      }
    }

    if (viajesProcesados > 0) {
       res.json({ success: true, viajesProcesados, errorWarning: fallbackError });
    } else {
       res.status(500).json({ error: fallbackError || "Error desconocido procesando Lote" });
    }

  } catch (err) {
    console.error("Error global batch parsing:", err);
    res.status(500).json({ error: err.message });
  }
});

// 💰 3. Registrar Gastos (Gasolina / Aceite)
router.post('/expenses', async (req, res) => {
  const { shift_id, type, amount, odometer, description } = req.body;
  try {
    await db.execute(
      'INSERT INTO expenses (shift_id, type, amount, odometer, description) VALUES (?, ?, ?, ?, ?)',
      [shift_id, type, amount, odometer, description]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🛑 4. Cerrar Turno (Corte de Caja)
router.post('/shifts/close', async (req, res) => {
  const { shift_id, final_odometer, final_cash_counted } = req.body;
  try {
    // Calcular totales usando columnas reales de la tabla entries
    const [entries] = await db.execute('SELECT SUM(ganancia_neta_final) as total_neto, SUM(distancia_didi_km) as total_km FROM entries WHERE shift_id = ?', [shift_id]);
    const [expenses] = await db.execute('SELECT SUM(amount) as total_exp FROM expenses WHERE shift_id = ?', [shift_id]);
    const [shift] = await db.execute('SELECT initial_cash, initial_odometer FROM shifts WHERE id = ?', [shift_id]);

    const totalNeto = Number(entries[0].total_neto || 0);
    const totalExp = Number(expenses[0].total_exp || 0);
    const expectedCash = shift[0].initial_cash + totalNeto - totalExp;
    const difference = final_cash_counted - expectedCash;

    // Semáforo: ROI sobre distancia total del turno
    const dist = final_odometer - shift[0].initial_odometer;
    const indicator = dist > 0 && (totalNeto / dist) >= 8 ? 'GREEN' : 'RED';

    await db.execute(
      'UPDATE shifts SET end_time = NOW(), final_odometer = ?, final_cash_counted = ?, settlement_difference = ?, status = "CLOSED", profit_indicator = ? WHERE id = ?',
      [final_odometer, final_cash_counted, difference, indicator, shift_id]
    );

    res.json({ success: true, expectedCash, difference, indicator });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📜 5. Historial de Decisiones (Diario/Semanal/Mensual)
router.get('/history', async (req, res) => {
  const { period } = req.query; // 'day', 'week', 'month'
  try {
    let dateFilter = '';
    if (period === 'day') dateFilter = 'DATE(created_at) = CURDATE()';
    else if (period === 'week') dateFilter = 'YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)';
    else if (period === 'month') dateFilter = 'MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())';
    
    // Si no pasan 'period', se traen los últimos 50 viajes.
    const query = `
      SELECT id, pasajero, distancia_didi_km, ganancia_neta_final, roi_km, calificacion_seleccion, created_at 
      FROM entries 
      ${dateFilter ? 'WHERE ' + dateFilter : ''} 
      ORDER BY created_at DESC LIMIT 50
    `;
    const [entries] = await db.execute(query);
    res.json({ success: true, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📊 6. Datos del Dashboard (Resumen del Día)
router.get('/dashboard', async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT 
        SUM(ganancia_neta_final) as currentDisposition,
        AVG(roi_km) as roiPromedio,
        SUM(distancia_didi_km) as total_km
      FROM entries 
      WHERE DATE(created_at) = CURDATE()
    `);
    
    // Asumimos un Shift siempre abierto para evitar romper si no hay uno
    const [shiftData] = await db.execute('SELECT initial_odometer FROM shifts ORDER BY id DESC LIMIT 1');
    // odometerDiff = KM DiDi recorridos hoy (lo que sí pagaron)
    const totalKmDidi = Number(stats[0].total_km || 0);

    res.json({ 
      success: true, 
      currentDisposition: stats[0].currentDisposition || 0,
      roi: stats[0].roiPromedio || 0,
      totalKmDidi: totalKmDidi
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
