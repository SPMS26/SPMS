import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Vehicle = sequelize.define('Vehicle', {
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
  vehicle_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: { notEmpty: true }
  },
  vehicle_type: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'four_wheeler'
  },
  vehicle_model: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  vehicle_color: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'vehicles'
});

export default Vehicle;
