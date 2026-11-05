import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

let io = null;

function initSocket(server, clientUrl) {
  io = new Server(server, {
    cors: {
      origin: clientUrl || '*',
      methods: ['GET', 'POST']
    }
  });

  // Private rooms are only for the logged-in user the token proves. A bad token still connects,
  // but gets public slot updates only.
  io.use(async (socket, next) => {
    try {
      const { id } = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET || 'spms_jwt_secret_key_2026_dev');
      const result = await db.query('SELECT id, role FROM users WHERE id = $1 AND is_active = true', [id]);
      socket.data.user = result.rows[0] || null;
    } catch {
      socket.data.user = null;
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join lot specific room
    socket.on('join:lot', (lotId) => {
      socket.join(`lot:${lotId}`);
      console.log(`[Socket.io] Socket ${socket.id} joined room lot:${lotId}`);
    });

    // Join user room for private notifications
    socket.on('join:user', (userId) => {
      if (socket.data.user?.id !== userId) return;
      socket.join(`user:${userId}`);
      console.log(`[Socket.io] Socket ${socket.id} joined room user:${userId}`);
    });

    // Join admin room
    socket.on('join:admin', () => {
      if (!['ADMIN', 'SECURITY'].includes(socket.data.user?.role)) return;
      socket.join('admin');
      console.log(`[Socket.io] Socket ${socket.id} joined admin room`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}

// Broadcasting helpers
function broadcastSlotUpdate(lotId, slotId, newStatus, slotNumber) {
  if (!io) return;
  io.emit('slot:statusChanged', { lotId, slotId, status: newStatus, slotNumber });
  io.to(`lot:${lotId}`).emit('lot:slotUpdated', { slotId, status: newStatus, slotNumber });
}

function broadcastKPIUpdate(kpis) {
  if (!io) return;
  io.to('admin').emit('kpi:updated', kpis);
}

function sendUserNotification(userId, notification) {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', notification);
}

function broadcastGateEvent(eventData) {
  if (!io) return;
  io.emit('gate:barrierEvent', eventData);
  io.to('admin').emit('gate:barrierEvent', eventData);
  if (eventData.lot_id) {
    io.to(`lot:${eventData.lot_id}`).emit('gate:barrierEvent', eventData);
  }
}

export {
  initSocket,
  getIO,
  broadcastSlotUpdate,
  broadcastKPIUpdate,
  sendUserNotification,
  broadcastGateEvent
};
