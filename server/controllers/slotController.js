import db from '../config/database.js';
import { broadcastSlotUpdate, sendUserNotification } from '../socket/socketManager.js';
import { canAccessLot, forbidLot, lotIdForSlot } from '../middleware/scope.js';
import { findLiveBooking } from '../services/bookingRules.js';

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

    if (!['available', 'reserved', 'occupied', 'maintenance'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid slot status.' });
    }
    if (!(await canAccessLot(req.user, await lotIdForSlot(id)))) return forbidLot(res);

    // Gate staff may only hold/release a slot (available <-> reserved)
    if (req.user.role === 'SECURITY') {
      const cur = await db.query('SELECT status FROM parking_slots WHERE id = $1', [id]);
      const curStatus = cur.rows[0]?.status;
      if (!['available', 'reserved'].includes(status) || !['available', 'reserved'].includes(curStatus)) {
        return res.status(403).json({ success: false, message: 'Security staff can only hold or release free slots.' });
      }
    }

    // A slot in use is freed by checking the vehicle out or by the booking lapsing, never by hand
    if (status === 'available' || status === 'maintenance') {
      const live = await findLiveBooking({ slotId: id });
      if (live) {
        const message = ['active', 'parked'].includes(live.booking_status)
          ? 'A vehicle is parked in this slot. Check it out first.'
          : 'This slot has a booking waiting for it and cannot be changed by hand.';
        return res.status(409).json({ success: false, message });
      }
    }

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

// Admin: Add a slot to a lot (reactivates a previously deleted slot with the same code)
export const createSlot = async (req, res, next) => {
  try {
    const { lot_id, floor } = req.body;
    const slotNumber = String(req.body.slot_number || '').trim().toUpperCase();
    const hourlyPrice = req.body.hourly_price === undefined || req.body.hourly_price === '' ? 30 : Number(req.body.hourly_price);

    if (!lot_id || !floor || !slotNumber) {
      return res.status(400).json({ success: false, message: 'Lot, floor and slot number are required.' });
    }
    if (!/^[A-Z0-9-]{1,10}$/.test(slotNumber)) {
      return res.status(400).json({ success: false, message: 'Slot number must be 1-10 letters, digits or hyphens.' });
    }
    if (String(floor).trim().length > 20) {
      return res.status(400).json({ success: false, message: 'Floor must be 20 characters or fewer.' });
    }
    if (!Number.isFinite(hourlyPrice) || hourlyPrice < 0) {
      return res.status(400).json({ success: false, message: 'Hourly price must be a non-negative number.' });
    }

    const lotRes = await db.query('SELECT id FROM parking_lots WHERE id = $1', [lot_id]);
    if (lotRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Parking lot not found.' });
    }
    if (!(await canAccessLot(req.user, lot_id))) return forbidLot(res);

    const existing = await db.query('SELECT id, is_active FROM parking_slots WHERE lot_id = $1 AND slot_number = $2', [lot_id, slotNumber]);
    let slot;
    if (existing.rows.length > 0) {
      if (existing.rows[0].is_active) {
        return res.status(409).json({ success: false, message: `Slot ${slotNumber} already exists in this lot.` });
      }
      const revived = await db.query(
        `UPDATE parking_slots
         SET is_active = true, status = 'available', floor = $1, hourly_price = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 RETURNING *`,
        [String(floor).trim(), hourlyPrice, existing.rows[0].id]
      );
      slot = revived.rows[0];
    } else {
      const inserted = await db.query(
        `INSERT INTO parking_slots (lot_id, slot_number, floor, hourly_price)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [lot_id, slotNumber, String(floor).trim(), hourlyPrice]
      );
      slot = inserted.rows[0];
    }

    broadcastSlotUpdate(slot.lot_id, slot.id, slot.status, slot.slot_number);
    res.status(201).json({ success: true, message: `Slot ${slot.slot_number} added.`, slot });
  } catch (err) {
    next(err);
  }
};

// Admin: Delete a slot. Slots with booking history are deactivated so history is preserved.
export const deleteSlot = async (req, res, next) => {
  try {
    const { id } = req.params;

    const slotRes = await db.query('SELECT * FROM parking_slots WHERE id = $1 AND is_active = true', [id]);
    if (slotRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Parking slot not found' });
    }
    const slot = slotRes.rows[0];
    if (!(await canAccessLot(req.user, slot.lot_id))) return forbidLot(res);

    const liveRes = await db.query(
      "SELECT 1 FROM bookings WHERE slot_id = $1 AND booking_status IN ('pending_payment', 'reserved', 'active') LIMIT 1",
      [id]
    );
    if (['occupied', 'reserved'].includes(slot.status) || liveRes.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Slot ${slot.slot_number} has an active or upcoming booking and cannot be deleted.`
      });
    }

    const historyRes = await db.query(
      `SELECT (SELECT COUNT(*) FROM bookings WHERE slot_id = $1)
            + (SELECT COUNT(*) FROM slot_reassignments WHERE old_slot_id = $1 OR new_slot_id = $1) AS refs`,
      [id]
    );
    const hasHistory = Number(historyRes.rows[0].refs) > 0;

    if (hasHistory) {
      await db.query(
        "UPDATE parking_slots SET is_active = false, status = 'maintenance', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );
    } else {
      await db.query('DELETE FROM parking_slots WHERE id = $1', [id]);
    }

    // Clients treat a deleted slot as unavailable and refresh their lot counts
    broadcastSlotUpdate(slot.lot_id, slot.id, 'maintenance', slot.slot_number);
    res.status(200).json({
      success: true,
      message: hasHistory
        ? `Slot ${slot.slot_number} removed (deactivated; booking history kept).`
        : `Slot ${slot.slot_number} deleted.`,
      deactivated: hasHistory
    });
  } catch (err) {
    next(err);
  }
};

// Admin: Generate many slots at once, e.g. sections A-C with 10 slots each
export const bulkCreateSlots = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { lot_id, sections, count_per_section, floor, slot_type, hourly_price } = req.body;
    const count = parseInt(count_per_section, 10);
    const price = hourly_price === undefined || hourly_price === '' ? 30 : Number(hourly_price);
    const sectionList = (Array.isArray(sections) ? sections : String(sections || '').split(','))
      .map((x) => String(x).trim().toUpperCase())
      .filter(Boolean);

    if (!lot_id || sectionList.length === 0 || !floor) {
      return res.status(400).json({ success: false, message: 'Lot, at least one section and a floor are required.' });
    }
    if (sectionList.some((x) => !/^[A-Z0-9]{1,4}$/.test(x))) {
      return res.status(400).json({ success: false, message: 'Section names must be 1-4 letters or digits.' });
    }
    if (!Number.isInteger(count) || count < 1 || count > 100 || sectionList.length * count > 500) {
      return res.status(400).json({ success: false, message: 'Slots per section must be 1-100 (max 500 slots per request).' });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ success: false, message: 'Hourly price must be a non-negative number.' });
    }
    if (!(await canAccessLot(req.user, lot_id))) return forbidLot(res);

    await client.query('BEGIN');
    const created = [];
    for (const section of sectionList) {
      for (let n = 1; n <= count; n++) {
        const slotNumber = `${section}${n}`;
        const r = await client.query(
          `INSERT INTO parking_slots (lot_id, slot_number, slot_type, floor, section, hourly_price)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (lot_id, slot_number) DO UPDATE
             SET is_active = true, status = 'available', floor = EXCLUDED.floor, hourly_price = EXCLUDED.hourly_price,
                 slot_type = EXCLUDED.slot_type, section = EXCLUDED.section, updated_at = CURRENT_TIMESTAMP
             WHERE parking_slots.is_active = false
           RETURNING *`,
          [lot_id, slotNumber, slot_type || 'car', String(floor).trim(), section, price]
        );
        if (r.rows[0]) created.push(r.rows[0]);
      }
    }
    await client.query('COMMIT');

    created.forEach((sl) => broadcastSlotUpdate(sl.lot_id, sl.id, sl.status, sl.slot_number));
    res.status(201).json({
      success: true,
      message: `${created.length} slot(s) created.`,
      created: created.length,
      skipped: sectionList.length * count - created.length
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// FR27. Slot Reassignment (admin/security of the owning lot; same-lot moves only)
export const reassignSlot = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { booking_id, new_slot_id, reason } = req.body;

    const bookingRes = await client.query(
      `SELECT b.*, s.lot_id AS lot_id FROM bookings b
       JOIN parking_slots s ON b.slot_id = s.id
       WHERE b.id = $1 FOR UPDATE OF b`,
      [booking_id]
    );

    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];

    if (!(await canAccessLot(req.user, booking.lot_id))) {
      await client.query('ROLLBACK');
      return forbidLot(res);
    }
    if (!['reserved', 'active'].includes(booking.booking_status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Only reserved or active bookings can be reassigned.' });
    }

    const oldSlotRes = await client.query('SELECT * FROM parking_slots WHERE id = $1', [booking.slot_id]);
    const newSlotRes = await client.query(
      "SELECT * FROM parking_slots WHERE id = $1 AND status = 'available' AND is_active = true FOR UPDATE",
      [new_slot_id]
    );

    if (newSlotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'New slot is invalid or not available' });
    }

    const oldSlot = oldSlotRes.rows[0];
    const newSlot = newSlotRes.rows[0];

    if (newSlot.lot_id !== oldSlot.lot_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'The new slot must be in the same parking lot.' });
    }

    await client.query("UPDATE parking_slots SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [oldSlot.id]);

    const newSlotStatus = booking.booking_status === 'active' ? 'occupied' : 'reserved';
    await client.query('UPDATE parking_slots SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newSlotStatus, newSlot.id]);

    // The QR pass encodes only the booking id + signature, so it stays valid after a slot move
    await client.query('UPDATE bookings SET slot_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newSlot.id, booking.id]);

    await client.query(
      `INSERT INTO slot_reassignments (booking_id, old_slot_id, new_slot_id, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [booking.id, oldSlot.id, newSlot.id, req.user.id, reason || 'Slot optimization']
    );

    let notification = null;
    if (booking.user_id) {
      const notifRes = await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'Slot Reassigned', $2, 'warning')
         RETURNING *`,
        [booking.user_id, `Your parking slot has been updated from ${oldSlot.slot_number} to ${newSlot.slot_number}. Your existing QR pass is still valid.`]
      );
      notification = notifRes.rows[0];
    }

    await client.query('COMMIT');

    if (notification) sendUserNotification(booking.user_id, notification);
    broadcastSlotUpdate(oldSlot.lot_id, oldSlot.id, 'available', oldSlot.slot_number);
    broadcastSlotUpdate(newSlot.lot_id, newSlot.id, newSlotStatus, newSlot.slot_number);

    res.status(200).json({
      success: true,
      message: `Slot successfully reassigned to ${newSlot.slot_number}`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
