import db from '../config/database.js';
import { broadcastSlotUpdate } from '../socket/socketManager.js';
import { formatDateTime } from '../utils/dateUtils.js';

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
    : `${c.booking_status === 'pending_payment' ? 'awaiting payment' : 'booked'} ${formatDateTime(c.booking_start)} - ${c.booking_end ? formatDateTime(c.booking_end) : 'open'}`;
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

/**
 * Automatically expire pre-bookings whose QR pass validity has expired and free their slots.
 * Runs on a recurring sweeper and lazily before gate queue and user booking lookups.
 */
export const expireStaleReservedBookings = async () => {
  try {
    const toExpireRes = await db.query(
      `SELECT b.id, b.slot_id, b.user_id, s.slot_number, s.lot_id
       FROM bookings b
       JOIN parking_slots s ON b.slot_id = s.id
       LEFT JOIN LATERAL (
         SELECT expires_at, is_active
         FROM qr_codes
         WHERE booking_id = b.id
         ORDER BY generated_at DESC LIMIT 1
       ) q ON true
       WHERE b.booking_status = 'reserved'
         AND (
           (q.expires_at IS NOT NULL AND q.expires_at <= CURRENT_TIMESTAMP)
           OR (q.expires_at IS NULL AND (COALESCE(b.booking_end, b.created_at + INTERVAL '2 hours') + INTERVAL '2 hours') <= CURRENT_TIMESTAMP)
           OR q.is_active = false
         )`
    );

    if (toExpireRes.rows.length === 0) return 0;

    const bookingIds = toExpireRes.rows.map((r) => r.id);
    const slotIds = toExpireRes.rows.map((r) => r.slot_id);

    // Update bookings to 'expired'
    await db.query(
      `UPDATE bookings 
       SET booking_status = 'expired', updated_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($1::uuid[])`,
      [bookingIds]
    );

    // Deactivate QR codes
    await db.query(
      `UPDATE qr_codes 
       SET is_active = false 
       WHERE booking_id = ANY($1::uuid[]) AND is_active = true`,
      [bookingIds]
    );

    // Free the parking slots if not occupied by another active booking
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

    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         SELECT b.user_id, 'Parking Pass Expired', 'Your parking pass validity has expired and your reservation has been closed.', 'warning'
         FROM bookings b
         WHERE b.id = ANY($1::uuid[])`,
        [bookingIds]
      );
    } catch (notifErr) {
      // Non-critical notification logging
    }

    return bookingIds.length;
  } catch (err) {
    console.error('[BookingRules] Failed to expire stale reserved bookings:', err.message);
    return 0;
  }
};

export const startPendingBookingSweeper = () => {
  const sweep = async () => {
    await expireStalePendingBookings();
    await expireStaleReservedBookings();
  };
  sweep();
  const timer = setInterval(sweep, 30 * 1000);
  timer.unref?.();
  return timer;
};
