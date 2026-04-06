const mysql = require('mysql2/promise');
require('dotenv').config();

async function describeFuelTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [rows] = await connection.execute('DESCRIBE fuel_receipts');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error("Error al describir fuel_receipts:", err);
  } finally {
    await connection.end();
  }
}

describeFuelTable();
