const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const { parseDidiReport, parseFuelReceipt } = require('../services/ai');

// Configuración de Multer para fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 🔄 Obtener Turno Activo
router.get('/shifts/active', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM shifts WHERE status = "OPEN" ORDER BY id DESC LIMIT 1');
    res.json({ success: true, activeShift: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🎬 1. Iniciar Turno (Apertura)
router.post('/shifts/open', async (req, res) => {
  const { initial_odometer, initial_cash, denominations } = req.body;
  try {
    // Cerrar cualquier turno previo abierto
    await db.execute('UPDATE shifts SET status = "CLOSED", end_time = NOW() WHERE status = "OPEN"');
    const [result] = await db.execute(
      'INSERT INTO shifts (initial_odometer, initial_cash, status) VALUES (?, ?, "OPEN")',
      [initial_odometer, initial_cash]
    );

    // Guardar denominaciones si vienen
    if (denominations) {
      const { m1, m2, m5, m10, b20, b50, b100, b200, b500, total } = denominations;
      await db.execute(
        `INSERT INTO shift_denominations (shift_id, type, m1, m2, m5, m10, b20, b50, b100, b200, b500, total_calculated)
         VALUES (?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [result.insertId, m1||0, m2||0, m5||0, m10||0, b20||0, b50||0, b100||0, b200||0, b500||0, total||initial_cash]
      );
    }

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
      const [lastShift] = await db.execute('SELECT final_odometer FROM shifts ORDER BY id DESC LIMIT 1');
      const startKm = lastShift[0]?.final_odometer || 195000;
      const [newShift] = await db.execute('INSERT INTO shifts (initial_odometer, initial_cash, status) VALUES (?, ?, "OPEN")', [startKm, 200]);
      shiftId = newShift.insertId;
    }

    let viajesProcesados = 0;
    let fallbackError = null;

    // Procesar en pares (2 fotos por viaje)
    // Si sube 30 fotos, habrán 15 viajes.
    for (let i = 0; i < req.files.length; i += 2) {
      try {
        const paths = [req.files[i].path];
        if (req.files[i + 1]) paths.push(req.files[i + 1].path);

        // 1. IA extrae datos del par de imágenes
        const aiData = await parseDidiReport(paths);
        
        // 🛡️ Filtro de Seguridad: Solo procesar viajes auténticos
        if (aiData.is_valid_didi_ride === false) {
          console.warn('⚠️ Imagen ignorada: No se detectó un resumen de viaje de DiDi válido.');
          continue;
        }

        // 🧠 LÓGICA DE AUDITORÍA MAESTRA (Matemática real en el Servidor)
        const d = Number(aiData.distancia) || 0;
        const n = Number(aiData.ganancias_desp_imp) || 0;
        const roi = d > 0 ? (n / d) : 0;
        
        // ⛽️ Costo dinámico: toma el más reciente de fuel_receipts
        const [fuelRows] = await db.execute('SELECT costo_real_km FROM fuel_receipts WHERE costo_real_km > 0 ORDER BY created_at DESC LIMIT 1');
        const gasCostPerKm = fuelRows.length > 0 ? Number(fuelRows[0].costo_real_km) : 2.27; // fallback si no hay ticket aún
        const profitReal = n - (d * gasCostPerKm);
        
        // El Juez Mazatleco decide:
        let calificacion = "Ineficiente";
        if (roi >= 18) calificacion = "Súper Élite";
        else if (roi >= 12) calificacion = "Excelente";
        else {
          if (d < 4) {
            if (n >= 30) calificacion = "Meta";
          } else {
            if (roi >= 8) calificacion = "Meta";
          }
        }

        // 2. Guardar en BD con nombres EXACTOS de DiDi (y cálculos confiables)
        await db.execute(
          `INSERT INTO entries (
            shift_id, pasajero_nombre, distancia, duracion, 
            fecha_hora_viaje, origen_direccion, destino_direccion, 
            tipo_vehiculo, metodo_pago, efectivo_recibido, 
            pagado_por_el_pasajero, tus_ganancias, ganancias_antes_imp, 
            tarifa_del_viaje, tarifa_base_total, tarifa_de_servicio, 
            cuota_de_solicitud, tarifa_dinamica, monto_adicional_por_gasolina, 
            impuesto, impuesto_tipo, ganancias_desp_imp, ganancia_real,
            roi_km, calificacion_seleccion, raw_data_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            shiftId,
            aiData.pasajero_nombre || 'App DiDi',
            d,
            aiData.duracion || '-',
            aiData.fecha_hora_viaje || '-',
            aiData.origen_direccion || '-',
            aiData.destino_direccion || '-',
            aiData.tipo_vehiculo || '-',
            aiData.metodo_pago || 'Desconocido',
            aiData.efectivo_recibido || 0,
            aiData.pagado_por_el_pasajero || 0,
            aiData.tus_ganancias || 0,
            aiData.ganancias_antes_imp || 0,
            aiData.tarifa_del_viaje || 0,
            aiData.tarifa_base_total || 0,
            aiData.tarifa_de_servicio || 0,
            aiData.cuota_de_solicitud || 0,
            aiData.tarifa_dinamica || 'No aplica',
            aiData.monto_adicional_por_gasolina || 0,
            aiData.impuesto || 0,
            aiData.impuesto_tipo || 'IVA',
            n,
            profitReal,
            roi,
            calificacion,
            JSON.stringify(aiData)
          ]
        );
        viajesProcesados++;
      } catch (err) {
        console.error("Error en par iterativo:", err.message);
        fallbackError = err.message; // Guardamos el error pero seguimos o detenemos según severidad
        // Si es 429 Too Many Requests (Rate limit de OpenAI), no tiene sentido seguir
        if (err.message.includes("429") || err.message.includes("Rate limit") || err.message.includes("Insufficient quota")) {
          break;
        }
        results.push(aiData);
      }
    }

    // Trigger de recalibración (ROI y Ganancia Real)
    const [fuelRows] = await db.execute('SELECT costo_real_km FROM fuel_receipts WHERE costo_real_km > 0 ORDER BY created_at DESC LIMIT 1');
    if (fuelRows.length > 0) {
      const latestPrice = Number(fuelRows[0].costo_real_km);
      await db.execute('UPDATE entries SET ganancia_real = ganancias_desp_imp - (distancia * ?), roi_km = (ganancias_desp_imp - (distancia * ?)) / (CASE WHEN distancia = 0 THEN 1 ELSE distancia END) WHERE shift_id = ?', [latestPrice, latestPrice, shiftId]);
    }

    res.json({ success: true, count: results.length });

  } catch (err) {
    console.error("Error global batch parsing:", err);
    res.status(500).json({ error: err.message });
  }
});

// ⛽️ 3. Cargar Ticket de Gasolina
router.post('/upload/fuel', upload.array('images', 5), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No images uploaded' });

  try {
    const paths = req.files.map(f => f.path);
    const aiData = await parseFuelReceipt(paths);

    const kmActual = Number(aiData.km_odometro_actual) || 0;

    // DETERMINAR ODÓMETRO ANTERIOR AUTOMÁTICAMENTE
    // Opción A: Del último ticket de gasolina
    const [lastFuel] = await db.execute('SELECT km_odometro_actual FROM fuel_receipts ORDER BY id DESC LIMIT 1');
    let kmAnterior = lastFuel[0]?.km_odometro_actual;

    // Opción B: Si no hay tickets, del turno activo
    if (!kmAnterior) {
      const [lastShift] = await db.execute('SELECT initial_odometer FROM shifts WHERE status = "OPEN" ORDER BY id DESC LIMIT 1');
      kmAnterior = lastShift[0]?.initial_odometer;
    }

    // Si aún no hay odómetro (ej: primer uso de la app), necesitamos uno inicial simbólico
    if (!kmAnterior) kmAnterior = kmActual > 0 ? kmActual - 10 : 0;

    await db.execute(
      `INSERT INTO fuel_receipts (
        fecha, gasolinera, producto, litros, precio_litro,
        importe_sin_iva, importe_iva, total_pagado,
        km_odometro_anterior, km_odometro_actual,
        forma_pago, raw_data_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        aiData.fecha || new Date().toISOString(),
        aiData.gasolinera || 'No identificada',
        aiData.producto || 'Magna',
        aiData.litros || 0,
        aiData.precio_litro || 0,
        aiData.importe_sin_iva || 0,
        aiData.importe_iva || 0,
        aiData.total_pagado || 0,
        kmAnterior,
        kmActual,
        aiData.forma_pago || 'Efectivo',
        JSON.stringify(aiData)
      ]
    );

    // Recalcular ganancia_real de viajes existentes con el nuevo costo
    const [fuelRows] = await db.execute('SELECT costo_real_km FROM fuel_receipts WHERE costo_real_km > 0 ORDER BY created_at DESC LIMIT 1');
    if (fuelRows.length > 0) {
      const newCost = Number(fuelRows[0].costo_real_km);
      await db.execute('UPDATE entries SET ganancia_real = ganancias_desp_imp - (distancia * ?) WHERE DATE(created_at) = CURDATE()', [newCost]);
    }

    res.json({ success: true, aiData });
  } catch (err) {
    console.error('Error Cubo Fierro:', err);
    res.status(500).json({ error: err.message });
  }
});

// ⛽️ 4. Cubo Fierro: Historial de Cargas de Gasolina
router.get('/fuel/history', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id, fecha, gasolinera, producto, litros, precio_litro,
             total_pagado, km_odometro_anterior, km_odometro_actual,
             km_recorridos, rendimiento_km_l, costo_real_km, 
             forma_pago, created_at
      FROM fuel_receipts
      ORDER BY created_at DESC LIMIT 30
    `);
    res.json({ success: true, receipts: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 💰 5. Registrar Gastos Manuales (Aceite / Mantenimiento)
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
  const { shift_id, final_odometer, final_cash_counted, denominations } = req.body;
  try {
    // Calcular totales usando nombres exactos
    const [entries] = await db.execute('SELECT SUM(ganancias_desp_imp) as total_neto, SUM(distancia) as total_km FROM entries WHERE shift_id = ?', [shift_id]);
    const [expenses] = await db.execute('SELECT SUM(amount) as total_exp FROM expenses WHERE shift_id = ?', [shift_id]);
    const [shift] = await db.execute('SELECT initial_cash, initial_odometer FROM shifts WHERE id = ?', [shift_id]);

    const totalNeto = Number(entries[0].total_neto || 0);
    const totalExp = Number(expenses[0].total_exp || 0);
    const expectedCash = shift[0].initial_cash + totalNeto - totalExp;
    const difference = final_cash_counted - expectedCash;

    // Guardar denominaciones si vienen
    if (denominations) {
      const { m1, m2, m5, m10, b20, b50, b100, b200, b500, total } = denominations;
      await db.execute(
        `INSERT INTO shift_denominations (shift_id, type, m1, m2, m5, m10, b20, b50, b100, b200, b500, total_calculated)
         VALUES (?, 'CLOSE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [shift_id, m1||0, m2||0, m5||0, m10||0, b20||0, b50||0, b100||0, b200||0, b500||0, total||final_cash_counted]
      );
    }

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
  const { period, date: queryDate } = req.query; // 'day', 'week', 'month', 'YYYY-MM-DD'
  try {
    const localDateExpr = 'DATE(CONVERT_TZ(created_at, "+00:00", "-07:00"))';
    const todayExpr = 'DATE(CONVERT_TZ(NOW(), "+00:00", "-07:00"))';

    let dateFilter = '';
    let params = [];

    if (queryDate) {
      dateFilter = `${localDateExpr} = ? OR DATE(fecha_hora_viaje) = ?`;
      params = [queryDate, queryDate];
    } else if (period === 'day') {
      dateFilter = `${localDateExpr} = ${todayExpr}`;
    } else if (period === 'week') {
      dateFilter = `YEARWEEK(CONVERT_TZ(created_at, "+00:00", "-07:00"), 1) = YEARWEEK(CONVERT_TZ(NOW(), "+00:00", "-07:00"), 1)`;
    } else if (period === 'month') {
      dateFilter = `MONTH(CONVERT_TZ(created_at, "+00:00", "-07:00")) = MONTH(CONVERT_TZ(NOW(), "+00:00", "-07:00")) AND YEAR(CONVERT_TZ(created_at, "+00:00", "-07:00")) = YEAR(CONVERT_TZ(NOW(), "+00:00", "-07:00"))`;
    }

    const query = `
      SELECT 
        id, pasajero_nombre, distancia, duracion, fecha_hora_viaje, 
        origen_direccion, destino_direccion, tipo_vehiculo, metodo_pago, 
        efectivo_recibido, pagado_por_el_pasajero, tus_ganancias, 
        ganancias_antes_imp, tarifa_del_viaje, tarifa_base_total, 
        tarifa_de_servicio, cuota_de_solicitud, tarifa_dinamica, 
        monto_adicional_por_gasolina, impuesto, impuesto_tipo, 
        ganancias_desp_imp, ganancia_real, roi_km, calificacion_seleccion, 
        created_at 
      FROM entries 
      ${dateFilter ? 'WHERE ' + dateFilter : ''} 
      ORDER BY created_at DESC LIMIT 100
    `;
    const [entries] = await db.execute(query, params);
    res.json({ success: true, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📊 6. Datos del Dashboard (Resumen del Día)
router.get('/dashboard', async (req, res) => {
  const queryDate = req.query.date; // YYYY-MM-DD
  try {
    // ⏰ Destino: Mazatlán (GMT-7)
    // Si no hay fecha en el query, calculamos la fecha actual en Mazatlán desde el servidor
    const targetDate = queryDate || new Date(new Date().getTime() - 7 * 3600 * 1000).toISOString().split('T')[0];

    const [stats] = await db.execute(`
      SELECT 
        COALESCE(SUM(ganancias_desp_imp), 0) as currentDisposition,
        COALESCE(SUM(ganancia_real), 0) as utilidadReal,
        (COALESCE(SUM(ganancias_desp_imp), 0) - COALESCE(SUM(ganancia_real), 0)) as gastoGasolina,
        COALESCE(AVG(roi_km), 0) as roiPromedio,
        COALESCE(SUM(distancia), 0) as total_km,
        COALESCE(SUM(CASE WHEN metodo_pago = 'En efectivo' THEN efectivo_recibido ELSE 0 END), 0) as ingresoEfectivo,
        COALESCE(SUM(CASE WHEN metodo_pago = 'Electrónico' THEN tus_ganancias ELSE 0 END), 0) as ingresoTarjeta
      FROM entries 
      WHERE (DATE(CONVERT_TZ(created_at, "+00:00", "-07:00")) = ? 
          OR DATE(fecha_hora_viaje) = ?)
    `, [targetDate, targetDate]);

    const result = stats[0] || {};
    res.json({
      success: true,
      currentDisposition: Number(result.currentDisposition || 0),
      utilidadReal: Number(result.utilidadReal || 0),
      gastoGasolina: Number(result.gastoGasolina || 0),
      roi: Number(result.roiPromedio || 0),
      totalKmDidi: Number(result.total_km || 0),
      ingresoEfectivo: Number(result.ingresoEfectivo || 0),
      ingresoTarjeta: Number(result.ingresoTarjeta || 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
