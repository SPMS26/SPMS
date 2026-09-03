const sequelize = require('../config/database');
const User = require('./User');
const Vehicle = require('./Vehicle');
const ParkingLot = require('./ParkingLot');
const ParkingSlot = require('./ParkingSlot');
const Booking = require('./Booking');
const Payment = require('./Payment');
const QRCode = require('./QRCode');
const SlotReassignment = require('./SlotReassignment');
const Notification = require('./Notification');
const IncidentReport = require('./IncidentReport');
const AdminLog = require('./AdminLog');

// User <-> Vehicle (1:M)
User.hasMany(Vehicle, { foreignKey: 'user_id', as: 'vehicles' });
Vehicle.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> Booking (1:M)
User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Vehicle <-> Booking (1:M)
Vehicle.hasMany(Booking, { foreignKey: 'vehicle_id', as: 'bookings' });
Booking.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });

// ParkingLot <-> ParkingSlot (1:M)
ParkingLot.hasMany(ParkingSlot, { foreignKey: 'lot_id', as: 'slots' });
ParkingSlot.belongsTo(ParkingLot, { foreignKey: 'lot_id', as: 'parking_lot' });

// ParkingSlot <-> Booking (1:M)
ParkingSlot.hasMany(Booking, { foreignKey: 'slot_id', as: 'bookings' });
Booking.belongsTo(ParkingSlot, { foreignKey: 'slot_id', as: 'slot' });

// Booking <-> Payment (1:1)
Booking.hasOne(Payment, { foreignKey: 'booking_id', as: 'payment' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// Booking <-> QRCode (1:M)
Booking.hasMany(QRCode, { foreignKey: 'booking_id', as: 'qr_codes' });
QRCode.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// Booking <-> SlotReassignment (1:M)
Booking.hasMany(SlotReassignment, { foreignKey: 'booking_id', as: 'reassignments' });
SlotReassignment.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

SlotReassignment.belongsTo(ParkingSlot, { foreignKey: 'old_slot_id', as: 'old_slot' });
SlotReassignment.belongsTo(ParkingSlot, { foreignKey: 'new_slot_id', as: 'new_slot' });
SlotReassignment.belongsTo(User, { foreignKey: 'changed_by', as: 'changed_by_user' });

// User <-> Notification (1:M)
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User / Booking / Slot <-> IncidentReport (1:M)
User.hasMany(IncidentReport, { foreignKey: 'user_id', as: 'incident_reports' });
IncidentReport.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Booking.hasMany(IncidentReport, { foreignKey: 'booking_id', as: 'incident_reports' });
IncidentReport.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

ParkingSlot.hasMany(IncidentReport, { foreignKey: 'slot_id', as: 'incident_reports' });
IncidentReport.belongsTo(ParkingSlot, { foreignKey: 'slot_id', as: 'slot' });

IncidentReport.belongsTo(User, { foreignKey: 'resolved_by', as: 'resolver' });

// User <-> AdminLog (1:M)
User.hasMany(AdminLog, { foreignKey: 'admin_id', as: 'admin_logs' });
AdminLog.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });

module.exports = {
  sequelize,
  User,
  Vehicle,
  ParkingLot,
  ParkingSlot,
  Booking,
  Payment,
  QRCode,
  SlotReassignment,
  Notification,
  IncidentReport,
  AdminLog
};
