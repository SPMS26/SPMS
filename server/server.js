const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');
const { initDb } = require('./config/initDb');
const { initSocket } = require('./socket/socketManager');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const lotRoutes = require('./routes/lotRoutes');
const slotRoutes = require('./routes/slotRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const qrRoutes = require('./routes/qrRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Process-level crash prevention guards
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception caught safely:', err.message, err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const server = http.createServer(app);

// CORS & Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

app.use(helmet({
  crossOriginResourcePolicy: false
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lots', lotRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Healthcheck Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    system: 'Smart Parking Management System (SPMS) API (Raw SQL Engine)',
    database: process.env.DB_NAME || 'spms',
    timestamp: new Date()
  });
});

// Global Error Handler
app.use(errorHandler);

// Initialize Socket.io
initSocket(server, process.env.CLIENT_URL);

const PORT = process.env.PORT || 5000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use by another running process.`);
    console.error(`👉 If an old node instance is running, kill it using PowerShell:`);
    console.error(`   Get-Process -Name node | Stop-Process -Force\n`);
  } else {
    console.error('[Server Error]:', err);
  }
});

async function startServer() {
  try {
    console.log(`[Server] Connecting to PostgreSQL database '${process.env.DB_NAME || 'spms'}' on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}...`);
    
    // Verify DB pool connection
    await db.query('SELECT 1');
    console.log('[Server] PostgreSQL connection verified via raw pg driver.');

    // Initialize raw SQL DDL tables if not exists
    await initDb();

    server.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` SPMS Backend API Server (Raw SQL) running on port ${PORT}`);
      console.log(` Database: PostgreSQL (${process.env.DB_NAME || 'spms'}@${process.env.DB_HOST || 'localhost'})`);
      console.log(` WebSocket Server attached via Socket.io`);
      console.log(` Healthcheck: http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('[Server] Failed to connect to PostgreSQL database:', err.message);
  }
}

startServer();
