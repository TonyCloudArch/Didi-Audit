const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // 1. Ampliar el ENUM de TIPO para aceptar 'recompensa' y 'cancelacion'
    // Como MySQL no permite modificar ENUMs fácilmente si ya hay datos, lo haremos paso a paso.
    // Primero, cambiamos a VARCHAR temporalmente si es necesario, o probamos el ALTER directo.
    await connection.execute("ALTER TABLE entries MODIFY COLUMN tipo VARCHAR(50) DEFAULT 'didi'");
    console.log("✅ Columna 'tipo' convertida a VARCHAR para flexibilidad.");
    
    // 2. Asegurarnos que la tabla 'shifts' (Inhibitoria) reciba estos datos correctamente
    // El Dashboard ya suma incentivos, pero debemos verificar si el AI envía 'recompensa'
  } catch (err) {
    console.error("Error en migración:", err);
  } finally {
    await connection.end();
  }
}

migrateDatabase();
