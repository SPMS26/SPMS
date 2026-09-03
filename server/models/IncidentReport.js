const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IncidentReport = sequelize.define('IncidentReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  booking_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'bookings', key: 'id' }
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  slot_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'parking_slots', key: 'id' }
  },
  incident_type: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'solved'),
    defaultValue: 'pending',
    allowNull: false
  },
  admin_response: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resolved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'incident_reports',
  updatedAt: false
});

module.exports = IncidentReport;
