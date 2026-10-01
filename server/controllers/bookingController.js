import db from '../config/database.js';
import { generateQRPayload, renderQRDataURL } from '../services/qrGenerator.js';
import { broadcastSlotUpdate } from '../socket/socketManager.js';

// Create Live Booking (Raw SQL + Transaction)
export const createLiveBooking = async (req, res, next) => {
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

    // Insert normalized booking
    const bookingRes = await client.query(
      `INSERT INTO bookings (user_id, vehicle_id, slot_id, booking_type, booking_status, booking_start, duration_minutes, pre_booking_fee, parking_charge, total_amount, payment_status)
       VALUES ($1, $2, $3, 'live_booking', 'reserved', CURRENT_TIMESTAMP, 120, 0.00, 0.00, $4, 'paid')
       RETURNING *`,
      [req.user.id, vehicle.id, slot.id, initialAmount]
    );

    const booking = bookingRes.rows[0];

    // Generate signed Live QR Payload & Render PNG Data URL on-the-fly
    const { payloadString, signatureHash } = generateQRPayload(booking, slot, lot, req.user, vehicle, { expiresAt });
    const qrDataURL = await renderQRDataURL(payloadString);

    // Create Payment record
    await client.query(
      `INSERT INTO payments (booking_id, amount, tax, payment_method, payment_status, payment_type, transaction_reference, paid_at)
       VALUES ($1, $2, 0, 'simulated', 'paid', 'reservation', $3, CURRENT_TIMESTAMP)`,
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

    // Enrich booking object with user, slot, and vehicle details
    booking.user = { id: req.user.id, full_name: req.user.full_name, email: req.user.email, phone: req.user.phone };
    booking.slot = { ...slot, parking_lot: lot };
    booking.vehicle = vehicle;

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
export const createPreBooking = async (req, res, next) => {
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

    // Authoritative dynamic pre-booking fee retrieved strictly from database system_settings
    const preBookingFee = await settingService.getNumericSetting('PRE_BOOKING_FEE', 10.00);

    // Reserve slot during pending pre-booking
    await client.query('UPDATE parking_slots SET status = \'reserved\', updated_at = CURRENT_TIMESTAMP WHERE id = $1', [slot.id]);

    // Insert booking in pending_payment status with zero QR code
    const bookingRes = await client.query(
      `INSERT INTO bookings (user_id, vehicle_id, slot_id, booking_type, booking_status, booking_start, booking_end, duration_minutes, pre_booking_fee, parking_charge, total_amount, payment_status)
       VALUES ($1, $2, $3, 'pre_booking', 'pending_payment', $4, $5, $6, $7, 0.00, $7, 'pending')
       RETURNING *`,
      [req.user.id, vehicle.id, slot.id, startDate, endDate, hours * 60, preBookingFee]
    );

    const booking = bookingRes.rows[0];

    // Create pending reservation payment record
    const paymentRes = await client.query(
      `INSERT INTO payments (booking_id, amount, tax, payment_method, payment_status, payment_type, transaction_reference)
       VALUES ($1, $2, 0, 'simulated', 'pending', 'reservation', $3)
       RETURNING *`,
      [booking.id, preBookingFee, `PRE-TXN-${Date.now()}`]
    );

    // Create user notification regarding pending payment
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Pre-Booking Created - Payment Required', $2, 'info')`,
      [req.user.id, `Pre-booking for slot ${slot.slot_number} at ${lot.name} is reserved. Complete the ₹${preBookingFee.toFixed(2)} reservation fee payment to activate your Digital QR Parking Pass.`]
    );

    await client.query('COMMIT');

    broadcastSlotUpdate(slot.lot_id, slot.id, 'reserved', slot.slot_number);

    // Notice: qr_code and qr_image are explicitly null. QR must NOT be generated before successful payment.
    res.status(201).json({
      success: true,
      message: 'Pre-Booking created! Please complete the reservation fee payment to generate your QR Pass.',
      booking,
      pre_booking_fee: preBookingFee,
      requires_payment: true,
      payment: paymentRes.rows[0],
      qr_code: null,
      qr_image: null
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// Confirm Pre-Booking Reservation Payment
// Stage 2: Confirms payment of pre-booking reservation fee, changes status to 'reserved' and 'paid', generates signed HMAC QR Pass
exports.confirmPreBookingPayment = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const bookingId = req.params.id || req.body.booking_id;

    if (!bookingId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Booking ID is required.' });
    }

    // Lock booking for update
    const bookingRes = await client.query(
      `SELECT b.*, u.full_name as user_name, v.vehicle_number, v.vehicle_type, v.vehicle_model,
              s.slot_number, s.floor, s.section, s.hourly_price, s.lot_id,
              l.name as lot_name, l.address as lot_address
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN parking_slots s ON b.slot_id = s.id
       JOIN parking_lots l ON s.lot_id = l.id
       WHERE b.id = $1 FOR UPDATE OF b`,
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingRes.rows[0];

    // Authorization check
    if (booking.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Unauthorized to confirm payment for this booking.' });
    }

    // If already paid and active, return existing QR if available
    if (booking.payment_status === 'paid' && booking.booking_status !== 'pending_payment') {
      const qrRes = await client.query(
        'SELECT * FROM qr_codes WHERE booking_id = $1 ORDER BY generated_at DESC LIMIT 1',
        [booking.id]
      );
      if (qrRes.rows.length > 0) {
        const qrRecord = qrRes.rows[0];
        const { payloadString } = generateQRPayload(
          booking,
          { id: booking.slot_id, slot_number: booking.slot_number, floor: booking.floor, section: booking.section, hourly_price: booking.hourly_price },
          { id: booking.lot_id, name: booking.lot_name },
          { id: booking.user_id, full_name: booking.user_name },
          { id: booking.vehicle_id, vehicle_number: booking.vehicle_number, vehicle_type: booking.vehicle_type },
          { expiresAt: qrRecord.expires_at }
        );
        const qrDataURL = await renderQRDataURL(payloadString);
        await client.query('COMMIT');
        return res.status(200).json({
          success: true,
          message: 'Reservation payment already confirmed.',
          booking,
          qr_code: payloadString,
          qr_image: qrDataURL,
          expires_at: qrRecord.expires_at
        });
      }
    }

    const transactionRef = req.body.transaction_reference || `PRE-TXN-${Date.now()}`;

    // Update reservation payment record to 'paid'
    await client.query(
      `UPDATE payments 
       SET payment_status = 'paid', transaction_reference = $1, paid_at = CURRENT_TIMESTAMP
       WHERE booking_id = $2 AND payment_type = 'reservation'`,
      [transactionRef, booking.id]
    );

    // Update booking status from pending_payment to reserved and payment_status to paid
    const updatedBookingRes = await client.query(
      `UPDATE bookings 
       SET booking_status = 'reserved', payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [booking.id]
    );
    const updatedBooking = updatedBookingRes.rows[0];

    // Calculate QR validity: booking_end + 2hr grace period, or 24hr for live
    const bookingEnd = updatedBooking.booking_end ? new Date(updatedBooking.booking_end) : new Date(Date.now() + 2 * 3600 * 1000);
    const expiresAt = new Date(bookingEnd.getTime() + 2 * 3600 * 1000);

    // Now generate signed QR pass
    const slotObj = { id: booking.slot_id, slot_number: booking.slot_number, floor: booking.floor, section: booking.section, hourly_price: booking.hourly_price };
    const lotObj = { id: booking.lot_id, name: booking.lot_name };
    const userObj = { id: booking.user_id, full_name: booking.user_name };
    const vehicleObj = { id: booking.vehicle_id, vehicle_number: booking.vehicle_number, vehicle_type: booking.vehicle_type };

    const { payloadString, signatureHash } = generateQRPayload(updatedBooking, slotObj, lotObj, userObj, vehicleObj, { expiresAt });
    const qrDataURL = await renderQRDataURL(payloadString);

    // Store signature hash and validity in qr_codes table
    await client.query(
      `INSERT INTO qr_codes (booking_id, signature_hash, version, is_active, generated_at, expires_at)
       VALUES ($1, $2, 1, true, CURRENT_TIMESTAMP, $3)`,
      [booking.id, signatureHash, expiresAt]
    );

    // Create user notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Reservation Payment Confirmed', $2, 'success')`,
      [booking.user_id, `Payment for slot ${booking.slot_number} at ${booking.lot_name} is confirmed. Your Digital QR Parking Pass has been generated and is now active.`]
    );

    await client.query('COMMIT');

    broadcastSlotUpdate(booking.lot_id, booking.slot_id, 'reserved', booking.slot_number);

    // Enrich booking object with user, slot, and vehicle details
    booking.user = { id: req.user.id, full_name: req.user.full_name, email: req.user.email, phone: req.user.phone };
    booking.slot = { ...slot, parking_lot: lot };
    booking.vehicle = vehicle;

    res.status(201).json({
      success: true,
      message: 'Reservation payment confirmed! Digital QR Pass generated.',
      booking: updatedBooking,
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
export const getUserBookings = async (req, res, next) => {
  try {
    const queryStr = `
      SELECT 
        b.*,
        json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'phone', u.phone) AS user,
        json_build_object(
          'id', s.id,
          'slot_number', s.slot_number,
          'floor', s.floor,
          'section', s.section,
          'hourly_price', s.hourly_price,
          'parking_lot', json_build_object('id', l.id, 'name', l.name, 'address', l.address)
        ) AS slot,
        json_build_object('id', v.id, 'vehicle_number', v.vehicle_number, 'vehicle_type', v.vehicle_type, 'vehicle_model', v.vehicle_model) AS vehicle,
        CASE 
          WHEN b.payment_status = 'paid' AND q.id IS NOT NULL THEN
            json_build_object(
              'id', q.id,
              'is_active', q.is_active,
              'expires_at', q.expires_at,
              'version', q.version
            )
          ELSE NULL
        END AS qr_meta
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
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
export const getBookingById = async (req, res, next) => {
  try {
    const queryStr = `
      SELECT 
        b.*,
        u.full_name as user_name,
        json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'phone', u.phone) AS user,
        json_build_object(
          'id', s.id,
          'slot_number', s.slot_number,
          'floor', s.floor,
          'section', s.section,
          'hourly_price', s.hourly_price,
          'parking_lot', json_build_object('id', l.id, 'name', l.name, 'address', l.address)
        ) AS slot,
        json_build_object('id', v.id, 'vehicle_number', v.vehicle_number, 'vehicle_type', v.vehicle_type, 'vehicle_model', v.vehicle_model) AS vehicle,
        json_build_object('amount', p.amount, 'payment_status', p.payment_status, 'transaction_reference', p.transaction_reference, 'payment_type', p.payment_type) AS payment,
        q.expires_at,
        q.is_active as qr_is_active
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN parking_slots s ON b.slot_id = s.id
      LEFT JOIN parking_lots l ON s.lot_id = l.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN LATERAL (
        SELECT amount, payment_status, transaction_reference, payment_type
        FROM payments
        WHERE booking_id = b.id
        ORDER BY id DESC LIMIT 1
      ) p ON true
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

    // Authorization check
    if (booking.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this booking.' });
    }

    // QR Pass must NOT be provided if reservation payment has not been completed
    if (booking.payment_status !== 'paid' || booking.booking_status === 'pending_payment') {
      return res.status(200).json({
        success: true,
        booking,
        payment_required: true,
        qr_code: null,
        qr_image: null,
        message: 'Reservation payment pending. QR Pass will be available once payment is complete.'
      });
    }

    // Dynamically generate signed payload and QR Data URL on demand for paid bookings
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

