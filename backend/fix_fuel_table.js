const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixFuelTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Verificar y agregar columna gasolinera si no existe
    await connection.execute("ALTER TABLE fuel_receipts ADD COLUMN gasolinera VARCHAR(255) DEFAULT 'Gasolinera'");
    console.log("✅ Columna 'gasolinera' agregada a fuel_receipts.");
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log("⚠️ La columna 'gasolinera' ya existe.");
    } else {
      console.error("Error al actualizar fuel_receipts:", err);
    }
  } finally {
    await connection.end();
  }
}

fixFuelTable();
