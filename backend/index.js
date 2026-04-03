const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 🛡️ Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🛣️ API Routes
app.use('/api', apiRoutes);

// 🩺 Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Didi Audit AI Backend is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Auditor Maestro en servicio puerto: ${PORT}`);
});
