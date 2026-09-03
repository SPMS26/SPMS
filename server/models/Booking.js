const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  vehicle_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'vehicles', key: 'id' }
  },
  slot_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'parking_slots', key: 'id' }
  },
  booking_type: {
    type: DataTypes.ENUM('pre_booking', 'live_booking'),
    allowNull: false
  },
  booking_status: {
    type: DataTypes.ENUM('reserved', 'active', 'completed', 'cancelled', 'expired'),
    defaultValue: 'reserved',
    allowNull: false
  },
  booking_start: {
    type: DataTypes.DATE,
    allowNull: true
  },
  booking_end: {
    type: DataTypes.DATE,
    allowNull: true
  },
  entry_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  exit_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  qr_code: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending',
    allowNull: false
  }
}, {
  tableName: 'bookings',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['slot_id'] },
    { fields: ['booking_status'] }
  ]
});

module.exports = Booking;
