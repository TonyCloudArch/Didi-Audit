const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanDeep() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log("🧼 Iniciando limpieza PROFUNDA de hoy 05/04/2026...");
    
    // Borrar de entries basado en la fecha de creación del registro
    const [didiRes] = await connection.execute(
      "DELETE FROM entries WHERE DATE(created_at) = '2026-04-05' OR fecha_hora_viaje LIKE '%05/04/2026%'"
    );
    console.log(`✅ ${didiRes.affectedRows} registros de DiDi (incluyendo rotos) eliminados.`);

    const [privRes] = await connection.execute("DELETE FROM private_trips WHERE fecha = '2026-04-05'");
    console.log(`✅ ${privRes.affectedRows} viajes privados eliminados.`);

  } catch (err) {
    console.error("Error crítico en limpieza profunda:", err);
  } finally {
    await connection.end();
  }
}

cleanDeep();
