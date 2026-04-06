const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDbStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // 1. Agregar columna 'tipo' para clasificar los registros
    await connection.execute("ALTER TABLE entries ADD COLUMN tipo VARCHAR(50) DEFAULT 'viaje' AFTER shift_id");
    console.log("✅ Columna 'tipo' agregada exitosamente.");
    
    // 2. Opcional: Agregar columna 'concepto_especial' para guardar nombres de bonos
    await connection.execute("ALTER TABLE entries ADD COLUMN concepto_especial VARCHAR(255) DEFAULT NULL AFTER tipo");
    console.log("✅ Columna 'concepto_especial' agregada exitosamente.");
    
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log("⚠️ Las columnas ya existen, continuando...");
    } else {
      console.error("Error en cirugía de BD:", err);
    }
  } finally {
    await connection.end();
  }
}

updateDbStructure();
