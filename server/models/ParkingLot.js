import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ParkingLot = sequelize.define('ParkingLot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: { notEmpty: true }
  },
  address: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  total_slots: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  available_slots: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'parking_lots'
});

export default ParkingLot;
