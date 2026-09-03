const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ParkingSlot = sequelize.define('ParkingSlot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  lot_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'parking_lots', key: 'id' }
  },
  slot_number: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { notEmpty: true }
  },
  slot_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'car'
  },
  status: {
    type: DataTypes.ENUM('available', 'reserved', 'occupied', 'maintenance'),
    defaultValue: 'available',
    allowNull: false
  },
  hourly_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 30.00
  },
  floor: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'GF'
  },
  section: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'parking_slots',
  indexes: [
    { fields: ['lot_id', 'slot_number'], unique: true }
  ]
});

module.exports = ParkingSlot;
