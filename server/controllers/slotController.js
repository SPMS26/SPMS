import db from '../config/database.js';
import { broadcastSlotUpdate, sendUserNotification } from '../socket/socketManager.js';
import { generateQRPayload } from '../services/qrGenerator.js';

// Get slots for a parking lot (Raw SQL)
export const getSlotsByLot = async (req, res, next) => {
  try {
    const { lotId } = req.params;
    const { floor } = req.query;

    let queryStr = 'SELECT * FROM parking_slots WHERE lot_id = $1 AND is_active = true';
    const params = [lotId];

    if (floor) {
      queryStr += ' AND floor = $2';
      params.push(floor);
    }

    queryStr += ' ORDER BY slot_number ASC';

    const result = await db.query(queryStr, params);
    res.status(200).json({ success: true, slots: result.rows });
  } catch (err) {
    next(err);
  }
};

// Admin: Update Slot Status (Raw SQL)
export const updateSlotStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await db.query(
      `UPDATE parking_slots 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Parking slot not found' });
    }

    const slot = result.rows[0];

    // Broadcast Socket.io update to all connected clients
    broadcastSlotUpdate(slot.lot_id, slot.id, slot.status, slot.slot_number);

    res.status(200).json({ success: true, message: `Slot status updated to ${status}`, slot });
  } catch (err) {
    next(err);
  }
};

// FR27. Slot Reassignment (Admin Feature Raw SQL + Transaction)
export const reassignSlot = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { booking_id, new_slot_id, reason } = req.body;

    // 1. Fetch booking with details
    const bookingRes = await client.query(
      `SELECT b.*, u.full_name as user_name, v.vehicle_number
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.id = $1`,
      [booking_id]
    );

    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];

    // 2. Fetch old slot & new slot
    const oldSlotRes = await client.query('SELECT * FROM parking_slots WHERE id = $1', [booking.slot_id]);
    const newSlotRes = await client.query('SELECT * FROM parking_slots WHERE id = $1 AND status = \'available\' FOR UPDATE', [new_slot_id]);

    if (newSlotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'New slot is invalid or not available' });
    }

    const oldSlot = oldSlotRes.rows[0];
    const newSlot = newSlotRes.rows[0];

    // 3. Free old slot
    await client.query('UPDATE parking_slots SET status = \'available\', updated_at = CURRENT_TIMESTAMP WHERE id = $1', [oldSlot.id]);

    // 4. Reserve new slot
    const newSlotStatus = booking.booking_status === 'active' ? 'occupied' : 'reserved';
    await client.query('UPDATE parking_slots SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newSlotStatus, newSlot.id]);

    // 5. Invalidate previous QR codes
    await client.query('UPDATE qr_codes SET is_active = false WHERE booking_id = $1', [booking.id]);

    // 6. Get latest QR version
    const qrVerRes = await client.query('SELECT version FROM qr_codes WHERE booking_id = $1 ORDER BY version DESC LIMIT 1', [booking.id]);
    const newVersion = (qrVerRes.rows.length > 0 ? qrVerRes.rows[0].version : 1) + 1;

    const lotRes = await client.query('SELECT * FROM parking_lots WHERE id = $1', [newSlot.lot_id]);
    const lot = lotRes.rows[0];

    const userObj = { full_name: booking.user_name };
    const vehObj = { vehicle_number: booking.vehicle_number };
    const newQRPayload = generateQRPayload(booking, newSlot, lot, userObj, vehObj, newVersion);

    const qrInsertRes = await client.query(
      `INSERT INTO qr_codes (booking_id, qr_data, version, is_active, expires_at)
       VALUES ($1, $2, $3, true, NOW() + INTERVAL '1 day')
       RETURNING *`,
      [booking.id, newQRPayload, newVersion]
    );

    // 7. Update booking
    await client.query(
      'UPDATE bookings SET slot_id = $1, qr_code = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [newSlot.id, newQRPayload, booking.id]
    );

    // 8. Log in slot_reassignments
    await client.query(
      `INSERT INTO slot_reassignments (booking_id, old_slot_id, new_slot_id, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [booking.id, oldSlot.id, newSlot.id, req.user.id, reason || 'Admin slot optimization']
    );

    // 9. Send notification
    const notifRes = await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, 'warning')
       RETURNING *`,
      [
        booking.user_id,
        'Slot Reassigned',
        `Your parking slot has been updated from ${oldSlot.slot_number} to ${newSlot.slot_number}. A new QR pass has been generated.`
      ]
    );

    await client.query('COMMIT');

    sendUserNotification(booking.user_id, notifRes.rows[0]);
    broadcastSlotUpdate(oldSlot.lot_id, oldSlot.id, 'available', oldSlot.slot_number);
    broadcastSlotUpdate(newSlot.lot_id, newSlot.id, newSlotStatus, newSlot.slot_number);

    res.status(200).json({
      success: true,
      message: `Slot successfully reassigned to ${newSlot.slot_number}`,
      newQRCode: qrInsertRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
