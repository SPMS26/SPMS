import db from '../config/database.js';

// Resolve which lots a user may operate on.
//   ADMIN    -> lots they own
//   SECURITY -> only their single assigned lot
export const getAccessibleLotIds = async (user) => {
  if (!user) return [];
  if (user.role === 'ADMIN') {
    const r = await db.query('SELECT id FROM parking_lots WHERE admin_id = $1', [user.id]);
    return r.rows.map((row) => row.id);
  }
  if (user.role === 'SECURITY') {
    return user.assigned_lot_id ? [user.assigned_lot_id] : [];
  }
  return [];
};

export const canAccessLot = async (user, lotId) => {
  if (!lotId) return false;
  const ids = await getAccessibleLotIds(user);
  return ids.includes(lotId);
};

// Owner (ADMIN) id for any staff account: an admin is their own owner, security reports to managed_by
export const getOwnerId = (user) => (user.role === 'SECURITY' ? user.managed_by : user.id);

export const lotIdForSlot = async (slotId) => {
  const r = await db.query('SELECT lot_id FROM parking_slots WHERE id = $1', [slotId]);
  return r.rows[0]?.lot_id || null;
};

export const lotIdForBooking = async (bookingId) => {
  const r = await db.query(
    'SELECT s.lot_id FROM bookings b JOIN parking_slots s ON b.slot_id = s.id WHERE b.id = $1',
    [bookingId]
  );
  return r.rows[0]?.lot_id || null;
};

export const forbidLot = (res, message = 'You do not have access to this parking lot.') =>
  res.status(403).json({ success: false, message });
