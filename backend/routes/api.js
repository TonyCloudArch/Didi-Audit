const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const { parseDidiReport, parseFuelReceipt } = require('../services/ai');

// 🛡️ Mazatlán Time Helper (GMT-7)
const isFutureDate = (dateStr) => {
  const mztNow = new Date(new Date().getTime() - 7 * 3600 * 1000).toISOString().split('T')[0];
  return dateStr > mztNow;
};

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
        [result.insertId, m1 || 0, m2 || 0, m5 || 0, m10 || 0, b20 || 0, b50 || 0, b100 || 0, b200 || 0, b500 || 0, total || initial_cash]
      );
    }

    res.json({ id: result.insertId, status: 'OPEN' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 💤 Marcar Día como Descansado
router.post('/shifts/rest', async (req, res) => {
  const { date } = req.body;

  if (isFutureDate(date)) {
    return res.status(400).json({ error: 'No puedes marcar como descanso una fecha futura.' });
  }

  console.log(`[REST] Iniciando proceso para fecha: ${date}`);
  try {
    // 🛡️ 1. Verificar que no haya un turno real
    console.log('[REST] Verificando turnos...');
    const [existingShifts] = await db.execute('SELECT id FROM shifts WHERE DATE(start_time) = ? AND initial_odometer != -1', [date]);
    if (existingShifts.length > 0) {
      console.log('[REST] Error: Ya hay un turno real.');
      return res.status(400).json({ error: 'Ya hay un turno laboral registrado en este día.' });
    }

    // 🛡️ 2. Verificar que no haya viajes ya cargados (DiDi o Privados)
    console.log('[REST] Verificando viajes...');
    // Optimizamos consulta para evitar STR_TO_DATE en toda la tabla si es posible, o al menos depuramos si falla
    const [existingEntries] = await db.execute("SELECT id FROM entries WHERE COALESCE(DATE(STR_TO_DATE(fecha_hora_viaje, '%d/%m/%Y, %h:%i:%s %p')), DATE(created_at)) = ?", [date]);
    const [existingPriv] = await db.execute("SELECT id FROM private_trips WHERE fecha = ?", [date]);
    if (existingEntries.length > 0 || existingPriv.length > 0) {
      console.log('[REST] Error: Hay viajes cargados.');
      return res.status(400).json({ error: 'No se puede marcar como descanso: Detectamos viajes registrados en esta fecha.' });
    }


    // ✅ Si todo está vacío (vuelo real y viajes), procedemos al registro del descanso

    // ✅ Si todo está vacío, procedemos al registro del descanso
    console.log('[REST] Registrando descanso...');
    await db.execute(
      'INSERT INTO shifts (start_time, end_time, initial_odometer, final_odometer, status) VALUES (?, ?, -1, -1, "CLOSED")',
      [`${date} 12:00:00`, `${date} 12:00:00`]
    );

    console.log('[REST] ÉXITO.');
    res.json({ success: true, message: 'Día marcado como descansado.' });
  } catch (err) {
    console.error("[REST] ERROR FATAL:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📸 2. Cargar Imágenes en Lote (Magic Reader Batch)
router.post('/upload/batch', upload.array('images', 60), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).send('No images uploaded');

  try {
    // Buscar o auto-crear turno si no hay uno
    const [activeShift] = await db.execute('SELECT id, DATE(start_time) as shift_date FROM shifts WHERE status = "OPEN" ORDER BY id DESC LIMIT 1');
    let shiftId = activeShift[0]?.id;

    // Fallback de fecha inteligente:
    // 1. Prioridad: Fecha que el usuario tiene seleccionada en el navegador (si viene en req.body)
    // 2. Segunda: Fecha del turno abierto actual
    // 3. Tercera: Fecha de hoy
    let shiftDateFallback = new Date().toLocaleDateString('es-MX');
    if (req.body.targetDate) {
      const td = req.body.targetDate.split('-');
      shiftDateFallback = `${td[2]}/${td[1]}/${td[0]}`; // Convertir YYYY-MM-DD a DD/MM/YYYY
    } else if (activeShift[0]?.shift_date) {
      shiftDateFallback = new Date(activeShift[0].shift_date).toLocaleDateString('es-MX');
    }
    if (!shiftId) {
      const [lastShift] = await db.execute('SELECT final_odometer FROM shifts ORDER BY id DESC LIMIT 1');
      const startKm = lastShift[0]?.final_odometer || 195000;
      const [newShift] = await db.execute('INSERT INTO shifts (initial_odometer, initial_cash, status) VALUES (?, ?, "OPEN")', [startKm, 200]);
      shiftId = newShift.insertId;
    }

    let viajesProcesados = 0;
    let fallbackError = null;

    // 🛡️ CANDADO GLOBAL DE CONCURRENCIA (Previene clics dobles/subidas gemelas)
    if (!global.recentUploads) global.recentUploads = new Set();

    // Procesar en pares (2 fotos por viaje) para soportar Viajes con Mapa
    for (let i = 0; i < req.files.length; i += 2) {
      try {
        const paths = [req.files[i].path];
        if (req.files[i + 1]) paths.push(req.files[i + 1].path);

        const aiResponse = await parseDidiReport(paths);
        const documentos = aiResponse.documentos || [aiResponse]; // Fallback por si acaso

        for (const aiData of documentos) {
          // 🛡️ CAJA NEGRA: Registrar qué vio la IA para diagnóstico
          const fs = require('fs');
          const logMsg = `[${new Date().toISOString()}] AI Vio: ${JSON.stringify(aiData)}\\n`;
          fs.appendFileSync('audit_log.txt', logMsg);

          if (!aiData.is_valid) {
            console.warn('⚠️ Imagen ignorada o no reconocida por la IA.');
            continue;
          }

          if (aiData.tipo_documento === 'gasolina') {
            // ... (resto del código de gasolina igual) ...
            const total = Number(aiData.total_pagado) || 0;
            const litros = Number(aiData.litros) || 0;
            const precio = Number(aiData.precio_litro) || 0;
            let kmAct = Number(aiData.km_odometro_actual) || 0;
            const [lastRec] = await db.execute('SELECT km_odometro_actual FROM fuel_receipts ORDER BY id DESC LIMIT 1');
            const kmAnt = lastRec[0]?.km_odometro_actual || 195000;
            if (kmAct <= kmAnt) kmAct = kmAnt;
            const distRecorrida = kmAct - kmAnt;
            const f = aiData.fecha || new Date().toLocaleString('es-MX');
            await db.execute(
              'INSERT INTO fuel_receipts (total_pagado, litros, precio_litro, km_odometro_actual, km_odometro_anterior, gasolinera, fecha, raw_data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [total, litros, precio, kmAct, kmAnt, aiData.gasolinera || 'Gasolinera', f, JSON.stringify(aiData)]
            );
            viajesProcesados++;
          }
          else if (aiData.tipo_documento === 'viaje' || aiData.tipo_documento === 'cancelacion' || aiData.tipo_documento === 'recompensa') {
            // 🚗 RAMA DE INGRESOS (Viajes, Cancelaciones y Bonos)
            const d = Number(aiData.distancia) || 0;
            const n = Number(aiData.tus_ganancias) || Number(aiData.monto_recompensa) || (aiData.tipo_documento === 'cancelacion' ? Number(aiData.pagado_por_el_pasajero) : 0) || 0;
            const n_neto = Number(aiData.ganancias_desp_imp) || n;

            let gasTotal = 0;
            let profitReal = n_neto;
            let roi = 0;

            if (aiData.tipo_documento === 'viaje') {
              const [fuelRows] = await db.execute('SELECT costo_real_km FROM fuel_receipts WHERE costo_real_km > 0 ORDER BY created_at DESC LIMIT 1');
              const gasCostPerKm = fuelRows.length > 0 ? Number(fuelRows[0].costo_real_km) : 2.27;
              gasTotal = d * gasCostPerKm;
              profitReal = n_neto - gasTotal;
              roi = d > 0 ? (n_neto / d) : 0;
            }

            // 🛡️ FILTRO DE CONCURRENCIA: Bloquear colisiones en milisegundos
            const dupKey = `${aiData.tipo_documento}_${n_neto}_${aiData.fecha_hora_viaje || '-'}`;
            if (global.recentUploads.has(dupKey)) {
              const skipMsg = `[${new Date().toISOString()}] 🚨 BLOQUEO DE CONCURRENCIA: Documento ${dupKey} ya en proceso. Abortando duplicado.\\n`;
              fs.appendFileSync('audit_log.txt', skipMsg);
              continue;
            }
            global.recentUploads.add(dupKey);
            setTimeout(() => global.recentUploads.delete(dupKey), 60000);

            // 🛡️ ESCUDO ANTI-DUPLICADOS (Base de Datos)
            // No guardamos si ya existe el mismo tipo, fecha y monto neto (Ignoramos pasajero por ser variable)
            const [dups] = await db.execute(
              "SELECT id FROM entries WHERE tipo = ? AND fecha_hora_viaje = ? AND ganancias_desp_imp = ? AND shift_id = ?",
              [aiData.tipo_documento, aiData.fecha_hora_viaje || '-', n_neto, shiftId]
            );

            if (dups.length > 0) {
              const skipMsg = `[${new Date().toISOString()}] ⏳ DUPLICADO DETECTADO (DB): El documento de $${n_neto} ya existe (ID: ${dups[0].id}). Saltando.\\n`;
              fs.appendFileSync('audit_log.txt', skipMsg);
              continue;
            }

            let calificacion = aiData.tipo_documento === 'recompensa' ? 'Bono Meta' : (aiData.tipo_documento === 'cancelacion' ? 'Cancelación' : "Ineficiente");
            if (aiData.tipo_documento === 'viaje') {
              if (roi >= 20) calificacion = "Boleto Dorado";
              else if (roi >= 12) calificacion = "Súper Élite";
              else if (roi >= 8) calificacion = "Eficiente";
              else if (roi >= 6) calificacion = "Pobre";
              else calificacion = "Fatal";
            }

            const finalDate = (aiData.fecha_hora_viaje && aiData.fecha_hora_viaje !== '-') ? aiData.fecha_hora_viaje : shiftDateFallback;

            await db.execute(
              `INSERT INTO entries (
                  shift_id, tipo, concepto_especial, pasajero_nombre, distancia, duracion, 
                  fecha_hora_viaje, origen_direccion, destino_direccion, 
                  tipo_vehiculo, metodo_pago, efectivo_recibido, 
                  pagado_por_el_pasajero, tus_ganancias, ganancias_antes_imp, 
                  tarifa_del_viaje, tarifa_base_total, tarifa_de_servicio, 
                  cuota_de_solicitud, tarifa_dinamica, monto_adicional_por_gasolina, 
                  impuesto, ganancias_desp_imp, ganancia_real,
                  roi_km, calificacion_seleccion, raw_data_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                shiftId, aiData.tipo_documento, aiData.concepto_especial || null,
                aiData.pasajero_nombre || (aiData.tipo_documento === 'recompensa' ? 'META CUMPLIDA' : 'App DiDi'),
                d, aiData.duracion || '-',
                finalDate, aiData.origen_direccion || '-', aiData.destino_direccion || '-',
                aiData.tipo_vehiculo || '-', aiData.metodo_pago || 'Desconocido', aiData.efectivo_recibido || 0,
                aiData.pagado_por_el_pasajero || 0, n, aiData.tus_ganancias || n,
                0, aiData.otras_deducciones_app || 0, aiData.tarifa_de_servicio || 0,
                aiData.cuota_de_solicitud || 0, aiData.tarifa_dinamica || 'No aplica',
                aiData.monto_adicional_por_gasolina || 0, aiData.impuesto || 0, n_neto,
                profitReal, roi, calificacion, JSON.stringify(aiData)
              ]
            );
            viajesProcesados++;
          }
        }
      } catch (err) {
        console.error("Error en Lector Mágico Universal:", err.message);
        fallbackError = err.message;
      }
    }

    // Trigger de recalibración (ROI Bruto y Ganancia Real)
    const [fuelRows] = await db.execute('SELECT costo_real_km FROM fuel_receipts WHERE costo_real_km > 0 ORDER BY created_at DESC LIMIT 1');
    const latestPrice = fuelRows.length > 0 ? Number(fuelRows[0].costo_real_km) : 2.27;

    await db.execute(
      `UPDATE entries 
       SET ganancia_real = tus_ganancias - (distancia * ?), 
           roi_km = tus_ganancias / (CASE WHEN distancia = 0 THEN 1 ELSE distancia END),
           calificacion_seleccion = CASE 
             WHEN (tus_ganancias / (CASE WHEN distancia = 0 THEN 1 ELSE distancia END)) >= 20 THEN 'Boleto Dorado'
             WHEN (tus_ganancias / (CASE WHEN distancia = 0 THEN 1 ELSE distancia END)) >= 12 THEN 'Súper Élite'
             WHEN (tus_ganancias / (CASE WHEN distancia = 0 THEN 1 ELSE distancia END)) >= 8 THEN 'Eficiente'
             WHEN (tus_ganancias / (CASE WHEN distancia = 0 THEN 1 ELSE distancia END)) >= 6 THEN 'Pobre'
             ELSE 'Fatal'
           END
       WHERE shift_id = ?`,
      [latestPrice, shiftId]
    );

    res.json({ success: true, count: viajesProcesados });

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
      await db.execute('UPDATE entries SET ganancia_real = tus_ganancias - (distancia * ?) WHERE DATE(created_at) = CURDATE()', [newCost]);
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
// Actualizar odómetro actual (mid-shift) para ROI Real en vivo y guardar historial
router.post('/shifts/sync', async (req, res) => {
  const { shift_id, current_odometer } = req.body;
  try {
    // 1. Snapshot histórico para análisis futuro
    await db.execute('INSERT INTO odometer_logs (shift_id, odometer) VALUES (?, ?)', [shift_id, current_odometer]);
    
    // 2. Estado actual para Dashboard
    await db.execute('UPDATE shifts SET current_odometer = ? WHERE id = ?', [current_odometer, shift_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/shifts/close', async (req, res) => {
  const { shift_id, final_odometer, final_cash_counted, denominations } = req.body;
  try {
    // Calcular totales usando nombres exactos (Didi + Privado)
    const [didiEntries] = await db.execute('SELECT SUM(ganancias_desp_imp) as total_neto, SUM(distancia) as total_km FROM entries WHERE shift_id = ?', [shift_id]);
    const [privEntries] = await db.execute('SELECT SUM(pago) as total_neto, SUM(distancia) as total_km FROM private_trips WHERE shift_id = ?', [shift_id]);
    const [expenses] = await db.execute('SELECT SUM(amount) as total_exp FROM expenses WHERE shift_id = ?', [shift_id]);
    const [shift] = await db.execute('SELECT initial_cash, initial_odometer FROM shifts WHERE id = ?', [shift_id]);

    const totalNeto = Number(didiEntries[0].total_neto || 0) + Number(privEntries[0].total_neto || 0);
    const totalKmProductivos = Number(didiEntries[0].total_km || 0) + Number(privEntries[0].total_km || 0);
    const totalExp = Number(expenses[0].total_exp || 0);
    const expectedCash = shift[0].initial_cash + totalNeto - totalExp;
    const difference = final_cash_counted - expectedCash;

    // Guardar denominaciones si vienen
    if (denominations) {
      const { m1, m2, m5, m10, b20, b50, b100, b200, b500, total } = denominations;
      await db.execute(
        `INSERT INTO shift_denominations (shift_id, type, m1, m2, m5, m10, b20, b50, b100, b200, b500, total_calculated)
         VALUES (?, 'CLOSE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [shift_id, m1 || 0, m2 || 0, m5 || 0, m10 || 0, b20 || 0, b50 || 0, b100 || 0, b200 || 0, b500 || 0, total || final_cash_counted]
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

// 📝 Registrar Viaje Privado
router.post('/private_trips', async (req, res) => {
  const { date, pago, distancia, descripcion } = req.body;
  const targetDate = date || new Date(new Date().getTime() - 7 * 3600 * 1000).toISOString().split('T')[0];

  if (isFutureDate(targetDate)) {
    return res.status(400).json({ error: 'No se pueden registrar viajes en fechas futuras.' });
  }

  try {
    const [shift] = await db.execute("SELECT id FROM shifts WHERE DATE(start_time) = ? AND status = 'OPEN' ORDER BY id DESC LIMIT 1", [targetDate]);
    const shiftId = shift[0] ? shift[0].id : null;

    // 🔥 CALCULO DE EFICIENCIA INMEDIATA (Fase 0 Fix)
    const [fuelRows] = await db.execute('SELECT costo_real_km FROM fuel_receipts WHERE costo_real_km > 0 ORDER BY created_at DESC LIMIT 1');
    const kmCost = fuelRows.length > 0 ? Number(fuelRows[0].costo_real_km) : 2.27;
    
    const roi_km = distancia > 0 ? (pago / distancia) : 0;
    const ganancia_real = pago - (distancia * kmCost);

    await db.execute(
      "INSERT INTO private_trips (shift_id, fecha, pago, distancia, roi_km, ganancia_real, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [shiftId, targetDate, pago, distancia, roi_km, ganancia_real, descripcion || 'Viaje Privado']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🏠 Registrar Movimiento Personal (No afectable a negocio)
router.post('/personal_movements', async (req, res) => {
  const { date, distancia, descripcion } = req.body;
  const targetDate = date || new Date(new Date().getTime() - 7 * 3600 * 1000).toISOString().split('T')[0];

  if (isFutureDate(targetDate)) {
    return res.status(400).json({ error: 'No se pueden registrar movimientos en fechas futuras.' });
  }

  try {
    const [shift] = await db.execute("SELECT id FROM shifts WHERE DATE(start_time) = ? AND status = 'OPEN' ORDER BY id DESC LIMIT 1", [targetDate]);
    const shiftId = shift[0] ? shift[0].id : null;

    await db.execute(
      "INSERT INTO personal_movements (shift_id, fecha, distancia, descripcion) VALUES (?, ?, ?, ?)",
      [shiftId, targetDate, distancia, descripcion || 'Movimiento Personal']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📜 5. Historial de Decisiones (Diario/Semanal/Mensual)
router.get('/history', async (req, res) => {
  const { period, date } = req.query;
  try {
    let didiQuery = "SELECT *, 'didi' as tipo FROM entries";
    let didiParams = [];

    if (date) {
      didiQuery += " WHERE COALESCE(DATE(STR_TO_DATE(fecha_hora_viaje, '%d/%m/%Y, %h:%i:%s %p')), DATE(STR_TO_DATE(fecha_hora_viaje, '%d/%m/%Y')), DATE(CONVERT_TZ(created_at, '+00:00', '-07:00'))) = ?";
      didiParams.push(date);
    } else if (period === 'week') {
      didiQuery += " WHERE COALESCE(DATE(STR_TO_DATE(fecha_hora_viaje, '%d/%m/%Y, %h:%i:%s %p')), DATE(created_at)) >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    }

    const [didiEntries] = await db.execute(didiQuery, didiParams);

    let privQuery = "SELECT *, 'privado' as tipo FROM private_trips";
    let privParams = [];
    if (date) {
      privQuery += " WHERE fecha = ?";
      privParams.push(date);
    }

    const [privateEntries] = await db.execute(privQuery, privParams);

    let personalQuery = "SELECT *, 'personal' as tipo FROM personal_movements";
    let personalParams = [];
    if (date) {
      personalQuery += " WHERE fecha = ?";
      personalParams.push(date);
    }
    const [personalEntries] = await db.execute(personalQuery, personalParams);

    const allEntries = [...didiEntries, ...privateEntries, ...personalEntries].sort((a, b) => {
      const dateA = a.tipo === 'didi' ? a.fecha_hora_viaje : a.fecha;
      const dateB = b.tipo === 'didi' ? b.fecha_hora_viaje : b.fecha;
      return new Date(dateB) - new Date(dateA);
    });

    res.json({ success: true, entries: allEntries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📊 6. Datos del Dashboard (Resumen del Día)
router.get('/dashboard', async (req, res) => {
  const queryDate = req.query.date;
  try {
    const targetDate = queryDate || new Date(new Date().getTime() - 7 * 3600 * 1000).toISOString().split('T')[0];

    // 1. Datos DiDi (Universal: Viajes, Cancelaciones y Recompensas)
    const [didiRows] = await db.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN tipo != 'recompensa' THEN ganancias_desp_imp ELSE 0 END), 0) as total_viajes_neto,
        COALESCE(SUM(CASE WHEN tipo != 'recompensa' THEN tus_ganancias ELSE 0 END), 0) as total_viajes_bruto,
        COALESCE(SUM(CASE WHEN tipo = 'recompensa' THEN tus_ganancias ELSE 0 END), 0) as total_recompensas,
        COALESCE(SUM(tarifa_de_servicio) + SUM(cuota_de_solicitud) + SUM(tarifa_base_total), 0) as cuota_didi,
        COALESCE(SUM(impuesto), 0) as total_impuestos,
        COALESCE(SUM(distancia), 0) as km_didi,
        COALESCE(SUM(CASE WHEN LOWER(metodo_pago) LIKE '%efectivo%' AND tipo != 'recompensa' THEN ganancias_desp_imp ELSE 0 END), 0) as ingresoEfectivo,
        COALESCE(SUM(CASE WHEN LOWER(metodo_pago) NOT LIKE '%efectivo%' AND tipo != 'recompensa' THEN ganancias_desp_imp ELSE 0 END), 0) as ingresoTarjeta
      FROM entries 
      WHERE COALESCE(
        DATE(STR_TO_DATE(fecha_hora_viaje, '%d/%m/%Y, %h:%i:%s %p')), 
        DATE(STR_TO_DATE(fecha_hora_viaje, '%d/%m/%Y')),
        DATE(CONVERT_TZ(created_at, '+00:00', '-07:00'))
      ) = ?
    `, [targetDate]);
    const didi = didiRows[0];

    // 2. Datos Privados
    const [privRows] = await db.execute(`SELECT COALESCE(SUM(pago), 0) as total, COALESCE(SUM(distancia), 0) as km_privado FROM private_trips WHERE fecha = ?`, [targetDate]);
    const priv = privRows[0];

    // 2.1 Datos Personales (Conceptos como Gym, Inglés, etc.)
    const [persRows] = await db.execute(`SELECT COALESCE(SUM(distancia), 0) as km_personal FROM personal_movements WHERE fecha = ?`, [targetDate]);
    const pers = persRows[0];

    // 3. Gasolina (Costo dinámico: Tomamos el último costo válido > 0 para evitar distorsiones)
    const [fuelRows] = await db.execute("SELECT costo_real_km FROM fuel_receipts WHERE costo_real_km > 0 ORDER BY id DESC LIMIT 1");
    const fuel = fuelRows[0] || { costo_real_km: 2.27 }; // Fallback si no hay promedios previos

    // 4. Turno (Control de odómetro)
    const [shiftRows] = await db.execute("SELECT initial_odometer, final_odometer, current_odometer, status FROM shifts WHERE DATE(CONVERT_TZ(start_time, '+00:00', '-07:00')) = ?", [targetDate]);
    const shift = shiftRows[0];

    // 🧠 MATEMÁTICA OPERATIVA INTEGRAL
    const totalViajesNeto = Number(didi.total_viajes_neto) + Number(priv.total);
    const totalRecompensas = Number(didi.total_recompensas);
    const totalIngresosEnMano = totalViajesNeto + totalRecompensas; // Lo que realmente queda tras impuestos y deudas

    const totalOperativo = Number(didi.total_viajes_bruto) + Number(priv.total) + totalRecompensas; // Ingreso Bruto antes de App Fee e Impuestos

    const kmProductivos = Number(didi.km_didi) + Number(priv.km_privado);
    const kmPersonales = Number(pers.km_personal);
    
    const initialOdo = shift?.initial_odometer || 0;
    const finalOdo = shift?.final_odometer || 0;
    const currentOdo = shift?.current_odometer || 0;
    
    // Matriz de Kilometraje Real: 
    // Prioridad 1: Final (Cerrado)
    // Prioridad 2: Actual (Sincronizado en vivo)
    // Prioridad 3: Solo Productivo + Personales (Caso default)
    const activeFinalDist = finalOdo > 0 ? finalOdo : (currentOdo > 0 ? currentOdo : 0);
    const kmTotalesOdo = activeFinalDist > 0 ? (activeFinalDist - initialOdo) : (kmProductivos + kmPersonales);
    
    // KM Operativos son los que realmente se usaron para generar dinero (Excluye Personales)
    const kmOperativos = kmTotalesOdo > kmPersonales ? (kmTotalesOdo - kmPersonales) : kmProductivos;
    const kmMuertosNegocio = kmOperativos > kmProductivos ? (kmOperativos - kmProductivos) : 0;

    const costoKm = fuel?.costo_real_km || 0;
    const gastoGasolina = kmTotalesOdo * costoKm; // La gasolina se gasta igual

    const utilidadReal = totalIngresosEnMano - gastoGasolina;
    const roi = kmOperativos > 0 ? (totalOperativo / kmOperativos) : 0;

    res.json({
      success: true,
      currentDisposition: totalIngresosEnMano,
      ingresoBruto: totalOperativo,
      impuestos: Number(didi.total_impuestos || 0),
      cuotaDidi: Number(didi.cuota_didi || 0),
      incentivos: totalRecompensas,
      utilidadReal: utilidadReal,
      gastoGasolina: gastoGasolina,
      roi: roi,
      total_km: kmTotalesOdo,
      km_muertos: kmMuertosNegocio,
      km_didi: Number(didi.km_didi),
      km_privado: Number(priv.km_privado),
      km_personal: kmPersonales,
      ingresoEfectivo: Number(didi.ingresoEfectivo) + Number(priv.total),
      ingresoTarjeta: Number(didi.ingresoTarjeta),
      shift_initial_odometer: shift ? Number(shift.initial_odometer) : null,
      shift_status: shift?.status || null
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
