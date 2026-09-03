const db = require('../config/database');
const { generateQRPayload, renderQRDataURL } = require('../services/qrGenerator');
const { broadcastSlotUpdate } = require('../socket/socketManager');

// Create Live Booking (Raw SQL + Transaction)
exports.createLiveBooking = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { slot_id, vehicle_id } = req.body;

    // Lock & check slot availability
    const slotRes = await client.query('SELECT * FROM parking_slots WHERE id = $1 AND status = \'available\' FOR UPDATE', [slot_id]);
    if (slotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Selected parking slot is no longer available.' });
    }

    const slot = slotRes.rows[0];

    const vehRes = await client.query('SELECT * FROM vehicles WHERE id = $1 AND user_id = $2', [vehicle_id, req.user.id]);
    if (vehRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Valid vehicle selection required.' });
    }

    const vehicle = vehRes.rows[0];

    const lotRes = await client.query('SELECT * FROM parking_lots WHERE id = $1', [slot.lot_id]);
    const lot = lotRes.rows[0];

    // Mark slot reserved
    await client.query('UPDATE parking_slots SET status = \'reserved\', updated_at = CURRENT_TIMESTAMP WHERE id = $1', [slot.id]);

    const initialAmount = parseFloat(slot.hourly_price || 30.00);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 Hours validity for live booking

    // Insert normalized booking (No duplicate JSON text)
    const bookingRes = await client.query(
      `INSERT INTO bookings (user_id, vehicle_id, slot_id, booking_type, booking_status, booking_start, duration_minutes, total_amount, payment_status)
       VALUES ($1, $2, $3, 'live_booking', 'reserved', CURRENT_TIMESTAMP, 120, $4, 'paid')
       RETURNING *`,
      [req.user.id, vehicle.id, slot.id, initialAmount]
    );

    const booking = bookingRes.rows[0];

    // Generate signed Live QR Payload & Render PNG Data URL on-the-fly
    const { payloadString, signatureHash } = generateQRPayload(booking, slot, lot, req.user, vehicle, { expiresAt });
    const qrDataURL = await renderQRDataURL(payloadString);

    // Create Payment record
    await client.query(
      `INSERT INTO payments (booking_id, amount, tax, payment_method, payment_status, transaction_reference, paid_at)
       VALUES ($1, $2, 0, 'simulated', 'paid', $3, CURRENT_TIMESTAMP)`,
      [booking.id, initialAmount, `LIVE-TXN-${Date.now()}`]
    );

    // Store only compact signature hash & state tracker in qr_codes table (Zero redundancy)
    await client.query(
      `INSERT INTO qr_codes (booking_id, signature_hash, version, is_active, generated_at, expires_at)
       VALUES ($1, $2, 1, true, CURRENT_TIMESTAMP, $3)`,
      [booking.id, signatureHash, expiresAt]
    );

    // Create user notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Live Booking Confirmed', $2, 'success')`,
      [req.user.id, `Your spot ${slot.slot_number} at ${lot.name} is reserved. Your Live QR Pass is active until ${expiresAt.toLocaleTimeString()}.`]
    );

    await client.query('COMMIT');

    broadcastSlotUpdate(slot.lot_id, slot.id, 'reserved', slot.slot_number);

    res.status(201).json({
      success: true,
      message: 'Live Booking Confirmed! Live QR Pass Generated.',
      booking,
      qr_code: payloadString,
      qr_image: qrDataURL,
      expires_at: expiresAt
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// Create Pre-Booking (Raw SQL + Transaction)
exports.createPreBooking = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { slot_id, vehicle_id, booking_start, duration_hours } = req.body;

    const slotRes = await client.query('SELECT * FROM parking_slots WHERE id = $1 AND status = \'available\' FOR UPDATE', [slot_id]);
    if (slotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Slot is no longer available for pre-booking.' });
    }

    const slot = slotRes.rows[0];

    const vehRes = await client.query('SELECT * FROM vehicles WHERE id = $1 AND user_id = $2', [vehicle_id, req.user.id]);
    if (vehRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Valid vehicle selection required.' });
    }

    const vehicle = vehRes.rows[0];

    const lotRes = await client.query('SELECT * FROM parking_lots WHERE id = $1', [slot.lot_id]);
    const lot = lotRes.rows[0];

    const hours = parseInt(duration_hours || 1, 10);
    const startDate = new Date(booking_start || Date.now());
    const endDate = new Date(startDate.getTime() + hours * 3600 * 1000);
    const expiresAt = new Date(endDate.getTime() + 2 * 3600 * 1000); // Expiry = booking end + 2hr grace period
    const baseFare = parseFloat(slot.hourly_price || 30.00) * hours;

    await client.query('UPDATE parking_slots SET status = \'reserved\', updated_at = CURRENT_TIMESTAMP WHERE id = $1', [slot.id]);

    const bookingRes = await client.query(
      `INSERT INTO bookings (user_id, vehicle_id, slot_id, booking_type, booking_status, booking_start, booking_end, duration_minutes, total_amount, payment_status)
       VALUES ($1, $2, $3, 'pre_booking', 'reserved', $4, $5, $6, $7, 'paid')
       RETURNING *`,
      [req.user.id, vehicle.id, slot.id, startDate, endDate, hours * 60, baseFare]
    );

    const booking = bookingRes.rows[0];

    // Generate signed Live QR Payload & Render PNG Data URL on-the-fly
    const { payloadString, signatureHash } = generateQRPayload(booking, slot, lot, req.user, vehicle, { expiresAt, issuedAt: startDate.toISOString() });
    const qrDataURL = await renderQRDataURL(payloadString);

    await client.query(
      `INSERT INTO payments (booking_id, amount, tax, payment_method, payment_status, transaction_reference, paid_at)
       VALUES ($1, $2, 0, 'simulated', 'paid', $3, CURRENT_TIMESTAMP)`,
      [booking.id, baseFare, `PRE-TXN-${Date.now()}`]
    );

    // Store only compact signature hash & state tracker in qr_codes table (Zero redundancy)
    await client.query(
      `INSERT INTO qr_codes (booking_id, signature_hash, version, is_active, generated_at, expires_at)
       VALUES ($1, $2, 1, true, CURRENT_TIMESTAMP, $3)`,
      [booking.id, signatureHash, expiresAt]
    );

    // Create user notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Pre-Booking Confirmed', $2, 'success')`,
      [req.user.id, `Pre-booking for slot ${slot.slot_number} at ${lot.name} is confirmed for ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}.`]
    );

    await client.query('COMMIT');

    broadcastSlotUpdate(slot.lot_id, slot.id, 'reserved', slot.slot_number);

    res.status(201).json({
      success: true,
      message: 'Pre-Booking Confirmed! Live QR Pass Generated.',
      booking,
      qr_code: payloadString,
      qr_image: qrDataURL,
      expires_at: expiresAt
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// Get user bookings with live QR details (Raw SQL Join)
exports.getUserBookings = async (req, res, next) => {
  try {
    const queryStr = `
      SELECT 
        b.*,
        json_build_object(
          'id', s.id,
          'slot_number', s.slot_number,
          'floor', s.floor,
          'section', s.section,
          'hourly_price', s.hourly_price,
          'parking_lot', json_build_object('id', l.id, 'name', l.name, 'address', l.address)
        ) AS slot,
        json_build_object('id', v.id, 'vehicle_number', v.vehicle_number, 'vehicle_type', v.vehicle_type, 'vehicle_model', v.vehicle_model) AS vehicle,
        json_build_object(
          'id', q.id,
          'is_active', q.is_active,
          'expires_at', q.expires_at,
          'version', q.version
        ) AS qr_meta
      FROM bookings b
      LEFT JOIN parking_slots s ON b.slot_id = s.id
      LEFT JOIN parking_lots l ON s.lot_id = l.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN LATERAL (
        SELECT id, is_active, expires_at, version 
        FROM qr_codes 
        WHERE booking_id = b.id 
        ORDER BY generated_at DESC LIMIT 1
      ) q ON true
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `;

    const result = await db.query(queryStr, [req.user.id]);
    res.status(200).json({ success: true, bookings: result.rows });
  } catch (err) {
    next(err);
  }
};

// Get single booking detail with live dynamic QR render (Raw SQL)
exports.getBookingById = async (req, res, next) => {
  try {
    const queryStr = `
      SELECT 
        b.*,
        u.full_name as user_name,
        json_build_object(
          'id', s.id,
          'slot_number', s.slot_number,
          'floor', s.floor,
          'section', s.section,
          'hourly_price', s.hourly_price,
          'parking_lot', json_build_object('id', l.id, 'name', l.name, 'address', l.address)
        ) AS slot,
        json_build_object('id', v.id, 'vehicle_number', v.vehicle_number, 'vehicle_type', v.vehicle_type, 'vehicle_model', v.vehicle_model) AS vehicle,
        json_build_object('amount', p.amount, 'payment_status', p.payment_status, 'transaction_reference', p.transaction_reference) AS payment,
        q.expires_at,
        q.is_active as qr_is_active
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN parking_slots s ON b.slot_id = s.id
      LEFT JOIN parking_lots l ON s.lot_id = l.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN payments p ON b.id = p.booking_id
      LEFT JOIN LATERAL (
        SELECT id, is_active, expires_at 
        FROM qr_codes 
        WHERE booking_id = b.id 
        ORDER BY generated_at DESC LIMIT 1
      ) q ON true
      WHERE b.id = $1
    `;

    const result = await db.query(queryStr, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = result.rows[0];
    
    // Dynamically generate signed payload and QR Data URL on demand
    const { payloadString } = generateQRPayload(
      booking,
      booking.slot,
      booking.slot?.parking_lot,
      { id: booking.user_id, full_name: booking.user_name },
      booking.vehicle,
      { expiresAt: booking.expires_at }
    );
    const qrImage = await renderQRDataURL(payloadString);

    res.status(200).json({ 
      success: true, 
      booking,
      qr_code: payloadString,
      qr_image: qrImage 
    });
  } catch (err) {
    next(err);
  }
};
