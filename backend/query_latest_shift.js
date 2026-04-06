const mysql = require('mysql2/promise');
require('dotenv').config();

async function getLatestShift() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [rows] = await connection.execute('SELECT * FROM shifts ORDER BY id DESC LIMIT 1');
    console.log(JSON.stringify(rows[0], null, 2));
  } catch (err) {
    console.error("Error al consultar:", err);
  } finally {
    await connection.end();
  }
}

getLatestShift();
