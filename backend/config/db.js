const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'audit_user',
  password: process.env.DB_PASSWORD || 'audit_user_pass',
  database: process.env.DB_NAME || 'didi_audit',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
