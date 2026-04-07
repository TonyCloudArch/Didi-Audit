const mysql = require('mysql2/promise');
require('dotenv').config();

const traccarPool = mysql.createPool({
  host: process.env.TRACCAR_DB_HOST || '127.0.0.1',
  user: process.env.TRACCAR_DB_USER || 'audit_user',
  password: process.env.TRACCAR_DB_PASS || 'audit_user_pass',
  database: process.env.TRACCAR_DB_NAME || 'traccar',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

module.exports = traccarPool;
