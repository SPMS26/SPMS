import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SlotReassignment = sequelize.define('SlotReassignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  booking_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'bookings', key: 'id' }
  },
  old_slot_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'parking_slots', key: 'id' }
  },
  new_slot_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'parking_slots', key: 'id' }
  },
  changed_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  changed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'slot_reassignments',
  timestamps: false
});

export default SlotReassignment;
