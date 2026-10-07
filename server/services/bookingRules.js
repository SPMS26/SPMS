import db from '../config/database.js';
import { broadcastSlotUpdate } from '../socket/socketManager.js';

// Unpaid pre-bookings hold a slot only for this long
export const PENDING_PAYMENT_MINUTES = Number(process.env.PENDING_PAYMENT_MINUTES || 15);

// Walk-ins have no end time; for overlap checks assume this stay when comparing with future bookings
export const WALK_IN_ASSUMED_HOURS = 2;

export const normalizePlate = (plate) => String(plate || '').toUpperCase().replace(/[\s-]/g, '');

// Serialise concurrent bookings for the same vehicle so two requests cannot both pass the overlap check
export const lockVehicle = (client, plate) =>
  client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`vehicle:${normalizePlate(plate)}`]);

/**
 * Find an existing booking for the same vehicle (matched by vehicle id or plate, so registered and
 * guest walk-in records are treated as one vehicle) whose time window overlaps [start, end).
 * Checked-in sessions (active/parked) have no fixed end and count until the vehicle exits.
 */
export const findOverlappingBooking = async (client, { vehicleId = null, plate, start, end, excludeBookingId = null }) => {
  const res = await client.query(
    `SELECT b.id, b.booking_status, b.booking_type, b.booking_start, b.booking_end,
            s.slot_number, l.name AS lot_name
     FROM bookings b
     JOIN parking_slots s ON b.slot_id = s.id
     JOIN parking_lots l ON s.lot_id = l.id
     LEFT JOIN vehicles v ON b.vehicle_id = v.id
     WHERE b.booking_status IN ('pending_payment', 'reserved', 'active', 'parked')
       AND (b.vehicle_id = $1::uuid
            OR REPLACE(REPLACE(UPPER(COALESCE(v.vehicle_number, b.guest_vehicle_number)), ' ', ''), '-', '') = $2)
       AND COALESCE(b.booking_start, b.created_at) < $4::timestamptz
       AND (b.booking_status IN ('active', 'parked') OR COALESCE(b.booking_end, 'infinity'::timestamptz) > $3::timestamptz)
       AND ($5::uuid IS NULL OR b.id <> $5::uuid)
     ORDER BY COALESCE(b.booking_start, b.created_at)
     LIMIT 1`,
    [vehicleId, normalizePlate(plate), start, end, excludeBookingId]
  );
  return res.rows[0] || null;
};

export const describeConflict = (plate, c) => {
  const when = c.booking_status === 'active' || c.booking_status === 'parked'
    ? 'currently parked'
    : `${c.booking_status === 'pending_payment' ? 'awaiting payment' : 'booked'} ${new Date(c.booking_start).toLocaleString()} - ${c.booking_end ? new Date(c.booking_end).toLocaleString() : 'open'}`;
  return `Vehicle ${plate} already has a booking that overlaps this time (${c.lot_name}, slot ${c.slot_number}, ${when}). A vehicle can only occupy one slot at a time.`;
};

/**
 * Cancel pre-bookings that were never paid within PENDING_PAYMENT_MINUTES and free their slots.
 * Runs on a timer and lazily before each new pre-booking.
 */
export const expireStalePendingBookings = async () => {
  try {
    const res = await db.query(
      `UPDATE bookings
       SET booking_status = 'cancelled', payment_status = 'expired', updated_at = CURRENT_TIMESTAMP
       WHERE booking_status = 'pending_payment'
         AND created_at < CURRENT_TIMESTAMP - make_interval(mins => $1::int)
       RETURNING id, slot_id`,
      [PENDING_PAYMENT_MINUTES]
    );
    if (res.rows.length === 0) return 0;

    const bookingIds = res.rows.map((r) => r.id);
    const slotIds = res.rows.map((r) => r.slot_id);

    await db.query(
      "UPDATE payments SET payment_status = 'expired' WHERE booking_id = ANY($1::uuid[]) AND payment_status = 'pending'",
      [bookingIds]
    );
    const freed = await db.query(
      `UPDATE parking_slots SET status = 'available', updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($1::uuid[]) AND status = 'reserved'
         AND NOT EXISTS (
           SELECT 1 FROM bookings ob
           WHERE ob.slot_id = parking_slots.id AND ob.booking_status IN ('pending_payment', 'reserved', 'active', 'parked')
         )
       RETURNING id, lot_id, slot_number`,
      [slotIds]
    );
    freed.rows.forEach((s) => broadcastSlotUpdate(s.lot_id, s.id, 'available', s.slot_number));
    return res.rows.length;
  } catch (err) {
    console.error('[BookingRules] Failed to expire stale pending bookings:', err.message);
    return 0;
  }
};

export const startPendingBookingSweeper = () => {
  const timer = setInterval(expireStalePendingBookings, 60 * 1000);
  timer.unref?.();
  return timer;
};
