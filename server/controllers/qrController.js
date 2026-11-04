import db from '../config/database.js';
import settingService from '../services/settingService.js';
import { getPaymentProvider } from '../services/paymentProvider.js';
import { generateQRPayload, generateExitPaymentQRPayload, verifyQRPayload, verifyExitPaymentQRPayload, renderQRDataURL } from '../services/qrGenerator.js';
import { broadcastSlotUpdate, broadcastGateEvent } from '../socket/socketManager.js';
import { getAccessibleLotIds, canAccessLot } from '../middleware/scope.js';
import { findOverlappingBooking, describeConflict, lockVehicle, WALK_IN_ASSUMED_HOURS, expireStaleReservedBookings, expireStalePendingBookings } from '../services/bookingRules.js';
import { formatDateTime } from '../utils/dateUtils.js';

/**
 * Robust Helper to resolve target booking from QR payload, pass code, vehicle plate, or UUID
 */
async function findBookingRaw(input, isExit = false, lotIds = null) {
  if (!input) return null;
  const trimmed = typeof input === 'string' ? input.trim() : String(input);

  let targetBookingId = null;
  let targetPassCode = null;
  let targetPlate = null;
  let isSignatureVerified = false;

  // 1. If JSON payload, verify HMAC signature & extract metadata
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.type === 'SPMS_EXIT_PAY') {
        const exitVerify = verifyExitPaymentQRPayload(parsed);
        if (exitVerify.isExpired) {
          return { isExpired: true, reason: 'Exit payment session expired' };
        }
        if (exitVerify.isValid) {
          isSignatureVerified = true;
          targetBookingId = exitVerify.bookingId;
          targetPassCode = exitVerify.passCode;
        }
      } else {
        const verification = verifyQRPayload(trimmed);
        if (verification.isExpired) {
          return { isExpired: true, payload: verification.payload, reason: verification.reason };
        }
        if (verification.isValid && verification.payload) {
          isSignatureVerified = true;
        }
        targetBookingId = parsed.bookingId || parsed.booking_id || parsed.id;
        targetPassCode = parsed.passCode || parsed.pass_code || parsed.code;
        targetPlate = parsed.vehicleNumber || parsed.vehicle_number;
      }
    } catch (e) {
      // JSON parse fallback
    }
  }

  // 2. Extract UUID if present anywhere in input string (including URL or json)
  const uuidMatch = trimmed.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (uuidMatch && !targetBookingId) {
    targetBookingId = uuidMatch[1];
  }

  // 3. Direct booking lookup by ID
  if (targetBookingId) {
    const res = await db.query(
      `SELECT b.*, COALESCE(u.full_name, 'Walk-in guest') as user_name, COALESCE(v.vehicle_number, b.guest_vehicle_number) as vehicle_number, v.vehicle_model, s.slot_number, s.lot_id, s.floor, s.hourly_price, l.name as lot_name
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       JOIN parking_slots s ON b.slot_id = s.id
       JOIN parking_lots l ON s.lot_id = l.id
       WHERE b.id = $1`,
      [targetBookingId]
    );
    if (res.rows.length > 0) {
      return { booking: res.rows[0], verified: isSignatureVerified };
    }
  }

  // 3b. Walk-in ticket code lookup (e.g. WK-4F7K2)
  const ticketMatch = trimmed.match(/^WK-?([A-Z0-9]{5})$/i);
  if (ticketMatch) {
    const res = await db.query(
      `SELECT b.*, COALESCE(u.full_name, 'Walk-in guest') as user_name, COALESCE(v.vehicle_number, b.guest_vehicle_number) as vehicle_number, v.vehicle_model, s.slot_number, s.lot_id, s.floor, s.hourly_price, l.name as lot_name
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       JOIN parking_slots s ON b.slot_id = s.id
       JOIN parking_lots l ON s.lot_id = l.id
       WHERE UPPER(b.ticket_code) = $1
       ORDER BY b.created_at DESC LIMIT 1`,
      [`WK-${ticketMatch[1].toUpperCase()}`]
    );
    if (res.rows.length > 0) {
      return { booking: res.rows[0], verified: false };
    }
  }

  // 4. Pass Code Lookup (e.g. BK-B0057365 or B0057365)
  const codeToSearch = targetPassCode || trimmed;
  const cleanCode = codeToSearch.replace(/^BK-/i, '').replace(/[^a-zA-Z0-9]/g, '');
  if (cleanCode.length >= 4) {
    const res = await db.query(
      `SELECT b.*, COALESCE(u.full_name, 'Walk-in guest') as user_name, COALESCE(v.vehicle_number, b.guest_vehicle_number) as vehicle_number, v.vehicle_model, s.slot_number, s.lot_id, s.floor, s.hourly_price, l.name as lot_name
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       JOIN parking_slots s ON b.slot_id = s.id
       JOIN parking_lots l ON s.lot_id = l.id
       WHERE REPLACE(b.id::text, '-', '') ILIKE $1
       ORDER BY b.created_at DESC LIMIT 1`,
      [`%${cleanCode}%`]
    );
    if (res.rows.length > 0) {
      return { booking: res.rows[0], verified: isSignatureVerified };
    }
  }

  // 5. Vehicle Plate Number Lookup (e.g. TS09 AB 1234 or TS09AB1234)
  const plateToSearch = targetPlate || trimmed;
  const normalizedPlate = plateToSearch.replace(/[\s-]/g, '');
  if (normalizedPlate.length >= 4) {
    const targetStatuses = isExit ? ['active', 'parked', 'reserved'] : ['reserved', 'pending', 'active'];
    const res = await db.query(
      `SELECT b.*, COALESCE(u.full_name, 'Walk-in guest') as user_name, COALESCE(v.vehicle_number, b.guest_vehicle_number) as vehicle_number, v.vehicle_model, s.slot_number, s.lot_id, s.floor, s.hourly_price, l.name as lot_name
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       JOIN parking_slots s ON b.slot_id = s.id
       JOIN parking_lots l ON s.lot_id = l.id
       WHERE REPLACE(REPLACE(COALESCE(v.vehicle_number, b.guest_vehicle_number), ' ', ''), '-', '') ILIKE $1
         AND b.booking_status = ANY($2::varchar[])
         AND ($3::uuid[] IS NULL OR s.lot_id = ANY($3::uuid[]))
       ORDER BY b.created_at DESC LIMIT 1`,
      [`%${normalizedPlate}%`, targetStatuses, lotIds]
    );
    if (res.rows.length > 0) {
      return { booking: res.rows[0], verified: isSignatureVerified };
    }
  }

  return null;
}

/**
 * Lot-scoped lookup: staff (SECURITY / ADMIN) can only resolve bookings in lots they operate.
 * Returns { forbidden: true } when the booking exists but belongs to another lot.
 */
async function findBookingForValidation(input, isExit = false, user = null) {
  const lotIds = user ? await getAccessibleLotIds(user) : null;
  if (lotIds && lotIds.length === 0) return { forbidden: true };
  const lookup = await findBookingRaw(input, isExit, lotIds);
  if (lookup && lookup.booking && lotIds && !lotIds.includes(lookup.booking.lot_id)) {
    return { forbidden: true };
  }
  return lookup;
}

const forbiddenLotResponse = (res) =>
  res.status(403).json({
    success: false,
    message: 'This pass or vehicle belongs to a different parking lot. You can only process vehicles for your assigned lot.'
  });

/**
 * Gate Keeper / Admin Validate Entry (Req-7, Req-8)
 */
export const validateEntry = async (req, res, next) => {
  try {
    const { qr_data, booking_id, pass_code, vehicle_number } = req.body;
    const inputIdentifier = qr_data || booking_id || pass_code || vehicle_number;

    if (!inputIdentifier) {
      return res.status(400).json({ success: false, message: 'Please scan a QR code or enter a pass code/vehicle number.' });
    }

    const lookup = await findBookingForValidation(inputIdentifier, false, req.user);

    if (lookup && lookup.forbidden) return forbiddenLotResponse(res);

    if (lookup && lookup.isExpired) {
      return res.status(400).json({
        success: false,
        isExpired: true,
        message: `QR Pass Expired! Valid window was until ${new Date(lookup.payload?.expiresAt).toLocaleTimeString()}. Entry denied.`
      });
    }

    if (!lookup || !lookup.booking) {
      return res.status(404).json({
        success: false,
        message: 'No active reservation found for this QR pass or vehicle plate.'
      });
    }

    const booking = lookup.booking;

    // Strict validation: reservation fee must be paid before gate entry
    if (booking.payment_status !== 'paid' || booking.booking_status === 'pending_payment') {
      return res.status(400).json({
        success: false,
        message: 'Reservation payment pending! Entry denied until pre-booking fee is paid.'
      });
    }

    // Check if session is already completed, cancelled or expired
    if (booking.booking_status === 'completed' || booking.booking_status === 'cancelled' || booking.booking_status === 'expired') {
      return res.status(400).json({
        success: false,
        isExpired: true,
        message: 'QR Pass Expired! This parking session is no longer active and cannot be reused.'
      });
    }

    // Duplicate entry check
    if (booking.booking_status === 'active' || booking.booking_status === 'parked') {
      return res.status(400).json({
        success: false,
        message: `Duplicate Entry: Vehicle ${booking.vehicle_number} is already checked in at Slot ${booking.slot_number}.`
      });
    }

    if (booking.booking_status !== 'reserved') {
      return res.status(400).json({
        success: false,
        message: `Invalid booking status '${booking.booking_status}' for gate entry.`
      });
    }

    // Check QR code record in DB for active flag and expiration
    const qrCheck = await db.query(
      `SELECT id, is_active, expires_at, generated_at 
       FROM qr_codes 
       WHERE booking_id = $1 
       ORDER BY generated_at DESC LIMIT 1`,
      [booking.id]
    );

    if (qrCheck.rows.length > 0) {
      const qrRecord = qrCheck.rows[0];
      if (!qrRecord.is_active) {
        return res.status(400).json({
          success: false,
          isExpired: true,
          message: 'QR Pass Deactivated! This pass has already been used or invalidated.'
        });
      }
      if (qrRecord.expires_at && new Date(qrRecord.expires_at) < new Date()) {
        await db.query('UPDATE qr_codes SET is_active = false WHERE id = $1', [qrRecord.id]);
        await db.query("UPDATE bookings SET booking_status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [booking.id]);
        const freed = await db.query(
          `UPDATE parking_slots SET status = 'available', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND status = 'reserved'
             AND NOT EXISTS (
               SELECT 1 FROM bookings ob
               WHERE ob.slot_id = parking_slots.id AND ob.booking_status IN ('pending_payment', 'reserved', 'active', 'parked')
             )
           RETURNING id, lot_id, slot_number`,
          [booking.slot_id]
        );
        freed.rows.forEach((s) => broadcastSlotUpdate(s.lot_id, s.id, 'available', s.slot_number));
        return res.status(400).json({
          success: false,
          isExpired: true,
          message: `QR Pass Expired! Validity ended on ${formatDateTime(qrRecord.expires_at)}. Entry denied.`
        });
      }
    }

    // Mark booking active & slot occupied with database-generated entry_time
    const updateRes = await db.query(
      `UPDATE bookings 
       SET booking_status = 'active', entry_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1
       RETURNING entry_time`,
      [booking.id]
    );
    const entryTime = updateRes.rows[0].entry_time;

    await db.query(
      `UPDATE parking_slots 
       SET status = 'occupied', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [booking.slot_id]
    );

    // Operator / Gate Keeper log
    const operatorName = req.user?.full_name || 'Autonomous Gate Terminal';
    const operatorId = req.user?.id || booking.user_id;

    if (operatorId) {
      try {
        await db.query(
          `INSERT INTO admin_logs (admin_id, action, target_table, target_id, description)
           VALUES ($1, 'GATE_ENTRY_CHECKIN', 'bookings', $2, $3)`,
          [operatorId, booking.id, `Gate Entry approved by ${operatorName} for ${booking.user_name} (${booking.vehicle_number}) at ${booking.lot_name}, Slot ${booking.slot_number}`]
        );
      } catch (logErr) {
        console.warn('Admin log skipped:', logErr.message);
      }
    }

    // User Notification (walk-in guests have no account)
    if (booking.user_id) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'Gate Entry Verified', $2, 'info')`,
        [booking.user_id, `Vehicle ${booking.vehicle_number} entered ${booking.lot_name} at ${new Date(entryTime).toLocaleTimeString()}. Head to Slot ${booking.slot_number} (${booking.floor}).`]
      );
    }

    broadcastSlotUpdate(booking.lot_id, booking.slot_id, 'occupied', booking.slot_number);

    const gateEventData = {
      event: 'ENTRY_CLEARED',
      barrier_status: 'OPENED',
      lot_id: booking.lot_id,
      slot_id: booking.slot_id,
      slot_number: booking.slot_number,
      vehicle_number: booking.vehicle_number,
      user_name: booking.user_name,
      timestamp: entryTime
    };
    broadcastGateEvent(gateEventData);

    res.status(200).json({
      success: true,
      message: 'Gate Entry Approved! Barrier Opening.',
      barrier_status: 'OPENED',
      action: 'ENTRY',
      booking_id: booking.id,
      pass_code: `BK-${booking.id.substring(0, 8).toUpperCase()}`,
      user_name: booking.user_name,
      vehicle_number: booking.vehicle_number,
      vehicle_model: booking.vehicle_model,
      lot_name: booking.lot_name,
      slot_number: booking.slot_number,
      floor: booking.floor,
      entry_time: entryTime,
      operator: operatorName
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Gate Keeper / Admin Validate Exit
 * Step 1: Validates exit QR, calculates duration & dynamic parking charge from parking_slots.hourly_price,
 * creates/updates PENDING exit payment, generates separate cryptographic Exit Payment QR.
 * Gate remains CLOSED until payment is confirmed.
 */
export const validateExit = async (req, res, next) => {
  try {
    const { qr_data, booking_id, pass_code, vehicle_number } = req.body;
    const inputIdentifier = qr_data || booking_id || pass_code || vehicle_number;

    if (!inputIdentifier) {
      return res.status(400).json({ success: false, message: 'Please scan a QR code or enter a pass code/vehicle number.' });
    }

    const lookup = await findBookingForValidation(inputIdentifier, true, req.user);

    if (lookup && lookup.forbidden) return forbiddenLotResponse(res);

    if (!lookup || !lookup.booking) {
      return res.status(404).json({
        success: false,
        message: 'No active parked booking found matching this QR code or vehicle plate.'
      });
    }

    const booking = lookup.booking;

    // Check if session has already completed (Duplicate Exit Protection)
    if (booking.booking_status === 'completed' || booking.booking_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        isExpired: true,
        message: 'QR Pass Expired! This parking session has already been completed and checked out.'
      });
    }

    // Check if vehicle has not entered yet (Missing Entry Protection)
    if (booking.booking_status === 'reserved' || booking.booking_status === 'pending_payment') {
      return res.status(400).json({
        success: false,
        message: `Entry not recorded! Vehicle ${booking.vehicle_number} has not entered the parking lot yet. Exit denied.`
      });
    }

    if (!booking.entry_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing entry timestamp! Cannot compute parking duration for this booking.'
      });
    }

    const exitTime = new Date();
    const entryTime = new Date(booking.entry_time);
    const durationMs = Math.max(1000, exitTime.getTime() - entryTime.getTime());
    const durationMinutes = Math.max(1, Math.ceil(durationMs / 60000));
    const durationHours = Math.max(1, Math.ceil(durationMinutes / 60));

    // Dynamic hourly rate authoritative from database: parking_slots.hourly_price
    const hourlyRate = parseFloat(booking.hourly_price);
    if (isNaN(hourlyRate) || hourlyRate <= 0) {
      return res.status(500).json({
        success: false,
        message: 'Unable to determine slot hourly price from database.'
      });
    }

    // Authoritative backend calculation
    const parkingCharge = parseFloat((durationHours * hourlyRate).toFixed(2));
    const preBookingFee = parseFloat(booking.pre_booking_fee || 0.00);
    const totalAmount = parseFloat((preBookingFee + parkingCharge).toFixed(2));

    // Retrieve configurable payment timeout from system_settings
    const timeoutSeconds = await settingService.getNumericSetting('EXIT_PAYMENT_TIMEOUT_SECONDS', 300);
    const paymentExpiresAt = new Date(Date.now() + timeoutSeconds * 1000);

    // Reuse or create pending payment record to prevent duplicate pending rows on retry
    const existingPending = await db.query(
      `SELECT * FROM payments 
       WHERE booking_id = $1 AND payment_type = 'parking_charge' AND payment_status = 'pending'
       ORDER BY id DESC LIMIT 1`,
      [booking.id]
    );

    let payment;
    const provider = getPaymentProvider('manual');
    const paymentOrder = await provider.createPayment({
      bookingId: booking.id,
      amount: parkingCharge,
      paymentType: 'parking_charge',
      timeoutSeconds
    });

    if (existingPending.rows.length > 0) {
      // Update existing pending payment record
      const updatePayRes = await db.query(
        `UPDATE payments 
         SET amount = $1, expires_at = $2, transaction_reference = $3
         WHERE id = $4
         RETURNING *`,
        [parkingCharge, paymentExpiresAt, paymentOrder.orderReference, existingPending.rows[0].id]
      );
      payment = updatePayRes.rows[0];
    } else {
      // Insert new pending payment record
      const insertPayRes = await db.query(
        `INSERT INTO payments (booking_id, amount, tax, payment_method, payment_status, payment_type, transaction_reference, expires_at)
         VALUES ($1, $2, 0, 'manual', 'pending', 'parking_charge', $3, $4)
         RETURNING *`,
        [booking.id, parkingCharge, paymentOrder.orderReference, paymentExpiresAt]
      );
      payment = insertPayRes.rows[0];
    }

    // Update booking with calculation details while keeping booking_status = 'active'
    await db.query(
      `UPDATE bookings 
       SET exit_time = CURRENT_TIMESTAMP, duration_minutes = $1, parking_charge = $2, total_amount = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [durationMinutes, parkingCharge, totalAmount, booking.id]
    );

    // Generate separate cryptographic Exit Payment QR
    const passCode = `BK-${booking.id.substring(0, 8).toUpperCase()}`;
    const exitQRPayload = generateExitPaymentQRPayload({
      paymentId: payment.id,
      bookingId: booking.id,
      passCode,
      expiresAt: paymentExpiresAt
    });
    const exitQRDataURL = await renderQRDataURL(exitQRPayload.payloadString);
    const upiUri = `upi://pay?pa=spmspay@bank&pn=SPMS%20Parking&am=${parkingCharge.toFixed(2)}&cu=INR&tn=Parking%20Fee%20Slot%20${booking.slot_number}`;

    const operatorName = req.user?.full_name || 'Autonomous Gate Terminal';
    const operatorId = req.user?.id || booking.user_id;

    if (operatorId) {
      try {
        await db.query(
          `INSERT INTO admin_logs (admin_id, action, target_table, target_id, description)
           VALUES ($1, 'EXIT_PAYMENT_CREATED', 'payments', $2, $3)`,
          [operatorId, payment.id, `Exit payment session created for ${booking.user_name} (${booking.vehicle_number}). Amount: ₹${parkingCharge.toFixed(2)}. Timeout: ${timeoutSeconds}s.`]
        );
      } catch (logErr) {
        console.warn('Admin log skipped:', logErr.message);
      }
    }

    // Socket.io: notify that exit payment is pending (barrier remains CLOSED, slot remains OCCUPIED)
    const gateEventData = {
      event: 'EXIT_PAYMENT_PENDING',
      barrier_status: 'CLOSED',
      lot_id: booking.lot_id,
      slot_id: booking.slot_id,
      slot_number: booking.slot_number,
      vehicle_number: booking.vehicle_number,
      user_name: booking.user_name,
      parking_charge: parkingCharge,
      timestamp: exitTime
    };
    broadcastGateEvent(gateEventData);

    res.status(200).json({
      success: true,
      message: 'Exit scanned. Parking payment required before barrier can be opened.',
      action: 'PAYMENT_REQUIRED',
      barrier_status: 'CLOSED',
      gate_authorized: false,
      payment_required: true,
      parking_charge: parkingCharge,
      pre_booking_fee: preBookingFee,
      total_amount: totalAmount,
      total_fee: totalAmount,
      payment: {
        id: payment.id,
        status: 'pending',
        amount: parkingCharge,
        payment_type: 'parking_charge',
        transaction_reference: payment.transaction_reference,
        expires_at: paymentExpiresAt,
        timeout_seconds: timeoutSeconds
      },
      booking: {
        id: booking.id,
        pass_code: passCode,
        user_name: booking.user_name,
        vehicle_number: booking.vehicle_number,
        vehicle_model: booking.vehicle_model,
        slot_number: booking.slot_number,
        floor: booking.floor,
        lot_name: booking.lot_name,
        entry_time: entryTime,
        exit_time: exitTime,
        duration_minutes: durationMinutes,
        duration_hours: durationHours,
        hourly_rate: hourlyRate,
        pre_booking_fee: preBookingFee,
        parking_charge: parkingCharge,
        total_amount: totalAmount,
        booking_status: booking.booking_status
      },
      exit_payment_qr: {
        qr_data: exitQRPayload.payloadString,
        qr_image: exitQRDataURL,
        upi_uri: upiUri,
        expires_at: paymentExpiresAt
      },
      operator: operatorName
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin / Operator Confirm Exit Payment
 * Step 2: Validates pending payment from DB, marks payment PAID, marks booking COMPLETED,
 * frees slot to AVAILABLE, deactivates QR, logs audit record, broadcasts Socket.io,
 * and OPENS THE GATE (barrier_status: 'OPENED', gate_authorized: true).
 */
export const confirmExitPayment = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { booking_id, payment_id, qr_data, notes, transaction_reference } = req.body;

    let targetBookingId = booking_id;
    let targetPaymentId = payment_id;

    // If QR payload provided, verify it
    if (qr_data) {
      const exitVerify = verifyExitPaymentQRPayload(qr_data);
      if (exitVerify.isValid) {
        targetBookingId = targetBookingId || exitVerify.bookingId;
        targetPaymentId = targetPaymentId || exitVerify.paymentId;
      }
    }

    if (!targetBookingId && !targetPaymentId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Booking ID or Payment ID is required.' });
    }

    // Lock booking for update
    let bookingQuery = `
      SELECT b.*, COALESCE(u.full_name, 'Walk-in guest') as user_name,
             COALESCE(v.vehicle_number, b.guest_vehicle_number) as vehicle_number, v.vehicle_model,
             s.slot_number, s.lot_id, s.floor, s.hourly_price, l.name as lot_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      JOIN parking_slots s ON b.slot_id = s.id
      JOIN parking_lots l ON s.lot_id = l.id
    `;
    let bookingParams = [];
    if (targetBookingId) {
      bookingQuery += ' WHERE b.id = $1 FOR UPDATE OF b';
      bookingParams = [targetBookingId];
    } else {
      bookingQuery += ' JOIN payments p ON b.id = p.booking_id WHERE p.id = $1 FOR UPDATE OF b';
      bookingParams = [targetPaymentId];
    }

    const bookingRes = await client.query(bookingQuery, bookingParams);
    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingRes.rows[0];

    if (!(await canAccessLot(req.user, booking.lot_id))) {
      await client.query('ROLLBACK');
      return forbiddenLotResponse(res);
    }

    // Check if session has already completed
    if (booking.booking_status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This parking session is already completed and checked out.'
      });
    }

    // Retrieve and lock the pending payment record from database
    let payQuery = `
      SELECT * FROM payments 
      WHERE booking_id = $1 AND payment_type = 'parking_charge'
    `;
    let payParams = [booking.id];
    if (targetPaymentId) {
      payQuery += ' AND id = $2';
      payParams.push(targetPaymentId);
    }
    payQuery += ' ORDER BY id DESC LIMIT 1 FOR UPDATE';

    const payRes = await client.query(payQuery, payParams);
    if (payRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'No exit payment record found for this booking. Please scan exit QR first.'
      });
    }

    const payment = payRes.rows[0];

    // Check if already paid
    if (payment.payment_status === 'paid') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Exit payment has already been confirmed.'
      });
    }

    // Check payment timeout
    if (payment.expires_at && new Date(payment.expires_at) < new Date()) {
      const operatorId = req.user?.id;
      if (operatorId) {
        try {
          await client.query(
            `INSERT INTO admin_logs (admin_id, action, target_table, target_id, description)
             VALUES ($1, 'EXIT_PAYMENT_EXPIRED', 'payments', $2, $3)`,
            [operatorId, payment.id, `Exit payment expired for ${booking.user_name} (${booking.vehicle_number}).`]
          );
        } catch (e) {}
      }
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        isExpired: true,
        message: 'Payment session timed out. Please scan exit QR again to retry payment.'
      });
    }

    // Authoritative amount strictly from database
    const authoritativeParkingCharge = parseFloat(payment.amount);
    const preBookingFee = parseFloat(booking.pre_booking_fee || 0.00);
    const totalAmount = parseFloat((preBookingFee + authoritativeParkingCharge).toFixed(2));

    const provider = getPaymentProvider('manual');
    const operatorName = req.user?.full_name || 'Autonomous Gate Terminal';
    const operatorId = req.user?.id || booking.user_id;

    const verification = await provider.verifyPayment({
      transactionReference: transaction_reference,
      operatorName,
      notes
    });

    // Mark payment as paid
    await client.query(
      `UPDATE payments 
       SET payment_status = 'paid', transaction_reference = $1, paid_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [verification.transactionReference, payment.id]
    );

    // Complete the booking
    const updateBookingRes = await client.query(
      `UPDATE bookings 
       SET booking_status = 'completed',
           exit_time = COALESCE(exit_time, CURRENT_TIMESTAMP),
           parking_charge = $1,
           total_amount = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [authoritativeParkingCharge, totalAmount, booking.id]
    );
    const updatedBooking = updateBookingRes.rows[0];

    // Release the parking slot
    await client.query(
      `UPDATE parking_slots 
       SET status = 'available', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [booking.slot_id]
    );

    // Expire/Deactivate the QR pass permanently
    await client.query('UPDATE qr_codes SET is_active = false WHERE booking_id = $1', [booking.id]);

    // Admin audit logging
    if (operatorId) {
      try {
        await client.query(
          `INSERT INTO admin_logs (admin_id, action, target_table, target_id, description)
           VALUES ($1, 'EXIT_PAYMENT_CONFIRMED', 'payments', $2, $3)`,
          [operatorId, payment.id, `Exit payment ₹${authoritativeParkingCharge.toFixed(2)} confirmed by ${operatorName} for ${booking.user_name} (${booking.vehicle_number}).`]
        );
        await client.query(
          `INSERT INTO admin_logs (admin_id, action, target_table, target_id, description)
           VALUES ($1, 'GATE_EXIT_AUTHORIZED', 'bookings', $2, $3)`,
          [operatorId, booking.id, `Gate Exit authorized by ${operatorName}. Barrier opened. Slot ${booking.slot_number} freed.`]
        );
      } catch (logErr) {
        console.warn('Admin log skipped:', logErr.message);
      }
    }

    // User notification (walk-in guests have no account)
    if (booking.user_id) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'Gate Exit Completed', $2, 'payment')`,
        [booking.user_id, `Vehicle ${booking.vehicle_number} exited ${booking.lot_name}. Final parking charge: ₹${authoritativeParkingCharge.toFixed(2)}. Total: ₹${totalAmount.toFixed(2)}. Barrier opened.`]
      );
    }

    await client.query('COMMIT');

    // Emit Socket.io events
    broadcastSlotUpdate(booking.lot_id, booking.slot_id, 'available', booking.slot_number);

    const gateEventData = {
      event: 'EXIT_CLEARED',
      barrier_status: 'OPENED',
      lot_id: booking.lot_id,
      slot_id: booking.slot_id,
      slot_number: booking.slot_number,
      vehicle_number: booking.vehicle_number,
      user_name: booking.user_name,
      timestamp: updatedBooking.exit_time
    };
    broadcastGateEvent(gateEventData);

    res.status(200).json({
      success: true,
      message: 'Exit payment verified successfully! Barrier opened.',
      barrier_status: 'OPENED',
      gate_authorized: true,
      action: 'EXIT_CLEARED',
      booking_id: booking.id,
      payment_id: payment.id,
      pass_code: `BK-${booking.id.substring(0, 8).toUpperCase()}`,
      user_name: booking.user_name,
      vehicle_number: booking.vehicle_number,
      slot_freed: booking.slot_number,
      floor: booking.floor,
      lot_name: booking.lot_name,
      entry_time: booking.entry_time,
      exit_time: updatedBooking.exit_time,
      duration_minutes: updatedBooking.duration_minutes,
      parking_charge: authoritativeParkingCharge,
      pre_booking_fee: preBookingFee,
      total_amount: totalAmount,
      transaction_reference: verification.transactionReference,
      operator: operatorName,
      paid_at: verification.paidAt
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * Get live QR pass data and rendered PNG Base64 image by Booking ID
 */
export const getLiveQR = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const bookingRes = await db.query(
      `SELECT b.*, u.full_name as user_name, v.vehicle_number, v.vehicle_type, s.slot_number, s.floor, s.section, s.hourly_price, l.name as lot_name, l.address as lot_address,
              q.is_active as qr_is_active, q.expires_at as qr_expires_at, q.generated_at as qr_generated_at, q.signature_hash
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN parking_slots s ON b.slot_id = s.id
       JOIN parking_lots l ON s.lot_id = l.id
       LEFT JOIN LATERAL (
         SELECT is_active, expires_at, generated_at, signature_hash
         FROM qr_codes
         WHERE booking_id = b.id
         ORDER BY generated_at DESC LIMIT 1
       ) q ON true
       WHERE b.id = $1`,
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingRes.rows[0];
    const isOwner = req.user && (req.user.id === booking.user_id || await canAccessLot(req.user, booking.lot_id));
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this QR pass.' });
    }

    // QR pass must NOT be accessible if reservation payment is pending
    if (booking.payment_status !== 'paid' || booking.booking_status === 'pending_payment') {
      return res.status(402).json({
        success: false,
        payment_required: true,
        message: 'Reservation payment pending! Digital QR pass cannot be accessed until reservation fee is paid.'
      });
    }

    if (!booking.signature_hash) {
      return res.status(404).json({
        success: false,
        message: 'QR Pass has not been generated for this booking.'
      });
    }

    // Generate signed payload dynamically from source relational data
    const { payloadString } = generateQRPayload(
      booking,
      { id: booking.slot_id, slot_number: booking.slot_number, floor: booking.floor, section: booking.section, hourly_price: booking.hourly_price },
      { id: booking.lot_id, name: booking.lot_name },
      { id: booking.user_id, full_name: booking.user_name },
      { id: booking.vehicle_id, vehicle_number: booking.vehicle_number, vehicle_type: booking.vehicle_type },
      { expiresAt: booking.qr_expires_at, issuedAt: booking.booking_start || booking.created_at }
    );
    const qrImage = await renderQRDataURL(payloadString);

    const isCompleted = booking.booking_status === 'completed';
    const isExpired = isCompleted || (booking.qr_expires_at ? new Date(booking.qr_expires_at) < new Date() : false) || booking.qr_is_active === false;
    const remainingMs = (!isExpired && booking.qr_expires_at) ? Math.max(0, new Date(booking.qr_expires_at) - new Date()) : 0;

    res.status(200).json({
      success: true,
      booking: {
        id: booking.id,
        passCode: `BK-${booking.id.substring(0, 8).toUpperCase()}`,
        booking_status: booking.booking_status,
        booking_type: booking.booking_type,
        total_amount: booking.total_amount,
        pre_booking_fee: booking.pre_booking_fee,
        parking_charge: booking.parking_charge,
        slot_number: booking.slot_number,
        floor: booking.floor,
        section: booking.section,
        lot_name: booking.lot_name,
        lot_address: booking.lot_address,
        user_name: booking.user_name,
        vehicle_number: booking.vehicle_number,
        vehicle_type: booking.vehicle_type,
        entry_time: booking.entry_time,
        exit_time: booking.exit_time
      },
      qr_code: payloadString,
      qr_image: qrImage,
      qr: {
        qr_data: payloadString,
        qr_image: qrImage,
        is_active: !isExpired && booking.qr_is_active !== false,
        is_expired: isExpired,
        expires_at: booking.qr_expires_at,
        generated_at: booking.qr_generated_at,
        remaining_seconds: Math.floor(remainingMs / 1000)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Gate Keeper Live Queue (all pending arrivals / active departures)
 */
export const getGateQueue = async (req, res, next) => {
  try {
    await expireStaleReservedBookings();
    await expireStalePendingBookings();

    const lotIds = await getAccessibleLotIds(req.user);

    const arrivalsRes = await db.query(
      `SELECT b.id, b.booking_status, b.created_at, b.booking_type, b.total_amount,
              u.full_name as "userName", u.phone,
              v.vehicle_number as "vehicleNo", v.vehicle_model,
              s.slot_number as "slotCode", s.floor,
              l.name as "lotName",
              q.expires_at, q.is_active
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN parking_slots s ON b.slot_id = s.id
       JOIN parking_lots l ON s.lot_id = l.id
       LEFT JOIN LATERAL (
         SELECT is_active, expires_at
         FROM qr_codes
         WHERE booking_id = b.id
         ORDER BY generated_at DESC LIMIT 1
       ) q ON true
       WHERE b.booking_status = 'reserved' 
         AND (q.expires_at IS NULL OR q.expires_at > CURRENT_TIMESTAMP)
         AND (q.is_active IS NULL OR q.is_active = true)
         AND s.lot_id = ANY($1::uuid[])
       ORDER BY b.created_at DESC`,
      [lotIds]
    );

    const parkedRes = await db.query(
      `SELECT b.id, b.booking_status, b.entry_time, b.created_at, b.booking_type, b.total_amount, b.ticket_code,
              COALESCE(u.full_name, 'Walk-in guest') as "userName", COALESCE(u.phone, b.guest_phone) as phone,
              COALESCE(v.vehicle_number, b.guest_vehicle_number) as "vehicleNo", v.vehicle_model,
              s.slot_number as "slotCode", s.floor, s.hourly_price,
              l.name as "lotName"
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       JOIN parking_slots s ON b.slot_id = s.id
       JOIN parking_lots l ON s.lot_id = l.id
       WHERE b.booking_status IN ('active', 'parked') AND s.lot_id = ANY($1::uuid[])
       ORDER BY b.entry_time DESC`,
      [lotIds]
    );

    res.status(200).json({
      success: true,
      pending_arrivals: arrivalsRes.rows.map(r => ({
        ...r,
        bookingId: `BK-${r.id.substring(0, 8).toUpperCase()}`
      })),
      active_parked: parkedRes.rows.map(r => ({
        ...r,
        bookingId: r.ticket_code || `BK-${r.id.substring(0, 8).toUpperCase()}`
      }))
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Autonomous Unattended Gate Verification (Auto-Detect Entry vs Exit)
 */
export const autoValidate = async (req, res, next) => {
  try {
    const { qr_data, booking_id, pass_code, vehicle_number, preferred_mode } = req.body;
    const inputIdentifier = qr_data || booking_id || pass_code || vehicle_number;

    if (!inputIdentifier) {
      return res.status(400).json({ success: false, message: 'Please present a QR pass in front of the camera.' });
    }

    // Attempt lookup
    let lookup = await findBookingForValidation(inputIdentifier, false, req.user);
    if (!lookup || !lookup.booking) {
      lookup = await findBookingForValidation(inputIdentifier, true, req.user);
    }

    if (lookup && lookup.forbidden) return forbiddenLotResponse(res);

    if (lookup && lookup.isExpired) {
      return res.status(400).json({
        success: false,
        isExpired: true,
        message: 'QR Pass Expired! This pass has expired and cannot be used.'
      });
    }

    if (!lookup || !lookup.booking) {
      return res.status(404).json({
        success: false,
        message: 'Access Denied: No valid reservation or vehicle record found in system.'
      });
    }

    const booking = lookup.booking;

    // Check if session is already completed or expired
    if (booking.booking_status === 'completed' || booking.booking_status === 'cancelled' || booking.booking_status === 'expired') {
      return res.status(400).json({
        success: false,
        isExpired: true,
        message: 'QR Pass Expired! This parking session is already completed or expired and cannot be reused.'
      });
    }

    // Check if payment is pending
    if (booking.booking_status === 'pending_payment' || booking.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Reservation payment pending! Entry denied.'
      });
    }

    // Check preferred mode or auto-determine based on booking_status
    const isArrival = preferred_mode === 'entry' ? true : (preferred_mode === 'exit' ? false : (booking.booking_status === 'reserved'));

    if (isArrival) {
      // Run Entry validation flow
      return validateEntry(req, res, next);
    } else {
      // Run Exit validation flow
      return validateExit(req, res, next);
    }
  } catch (err) {
    next(err);
  }
};


/**
 * Walk-in check-in (replaces self-service live booking).
 * The gate guard enters the vehicle plate and picks a free slot; the booking starts `active`
 * immediately and the slot turns `occupied` for every user. No QR is involved.
 * Exit reuses validate-exit -> confirm-exit-payment (billing from entry_time x slot hourly price).
 */
const TICKET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeTicketCode = () =>
  'WK-' + Array.from({ length: 5 }, () => TICKET_ALPHABET[Math.floor(Math.random() * TICKET_ALPHABET.length)]).join('');

export const walkInCheckIn = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { slot_id, phone } = req.body;
    const plate = String(req.body.vehicle_number || '').trim().toUpperCase();
    const normalizedPlate = plate.replace(/[\s-]/g, '');

    if (!slot_id) {
      return res.status(400).json({ success: false, message: 'Please select a slot.' });
    }
    if (normalizedPlate.length < 4 || plate.length > 20 || !/^[A-Z0-9 -]+$/.test(plate)) {
      return res.status(400).json({ success: false, message: 'Enter a valid vehicle number (4-20 letters/digits).' });
    }

    await client.query('BEGIN');

    const slotRes = await client.query(
      `SELECT s.*, l.name AS lot_name, l.is_active AS lot_active
       FROM parking_slots s JOIN parking_lots l ON s.lot_id = l.id
       WHERE s.id = $1 FOR UPDATE OF s`,
      [slot_id]
    );
    if (slotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Slot not found.' });
    }
    const slot = slotRes.rows[0];

    if (!(await canAccessLot(req.user, slot.lot_id))) {
      await client.query('ROLLBACK');
      return forbiddenLotResponse(res);
    }
    if (!slot.lot_active || !slot.is_active || slot.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: `Slot ${slot.slot_number} is not available.` });
    }

    // Reject if this vehicle is parked or booked anywhere in the window this walk-in will occupy
    await lockVehicle(client, plate);
    const now = new Date();
    const conflict = await findOverlappingBooking(client, {
      plate,
      start: now,
      end: new Date(now.getTime() + WALK_IN_ASSUMED_HOURS * 3600 * 1000)
    });
    if (conflict) {
      await client.query('ROLLBACK');
      const hint = conflict.booking_status === 'reserved' || conflict.booking_status === 'pending_payment'
        ? ' If the driver has a pre-booking for now, scan their QR pass instead.'
        : '';
      return res.status(409).json({ success: false, message: describeConflict(plate, conflict) + hint });
    }

    // Link to a registered vehicle/account when the plate matches
    const vehRes = await client.query(
      `SELECT v.id, v.user_id FROM vehicles v
       WHERE REPLACE(REPLACE(UPPER(v.vehicle_number), ' ', ''), '-', '') = $1 LIMIT 1`,
      [normalizedPlate]
    );
    const vehicle = vehRes.rows[0] || null;

    let ticketCode = makeTicketCode();
    for (let i = 0; i < 5; i++) {
      const taken = await client.query('SELECT 1 FROM bookings WHERE ticket_code = $1', [ticketCode]);
      if (taken.rows.length === 0) break;
      ticketCode = makeTicketCode();
    }

    const bookingRes = await client.query(
      `INSERT INTO bookings
         (user_id, vehicle_id, slot_id, booking_type, booking_status, booking_start, entry_time,
          pre_booking_fee, parking_charge, total_amount, payment_status,
          guest_vehicle_number, guest_phone, created_by, ticket_code)
       VALUES ($1, $2, $3, 'walk_in', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
               0, 0, 0, 'pending', $4, $5, $6, $7)
       RETURNING *`,
      [
        vehicle ? vehicle.user_id : null,
        vehicle ? vehicle.id : null,
        slot.id,
        vehicle ? null : plate,
        phone || null,
        req.user.id,
        ticketCode
      ]
    );
    const booking = bookingRes.rows[0];

    await client.query("UPDATE parking_slots SET status = 'occupied', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [slot.id]);

    await client.query(
      `INSERT INTO admin_logs (admin_id, action, target_table, target_id, description)
       VALUES ($1, 'WALK_IN_CHECKIN', 'bookings', $2, $3)`,
      [req.user.id, booking.id, `Walk-in check-in by ${req.user.full_name}: ${plate} at ${slot.lot_name}, slot ${slot.slot_number} (ticket ${ticketCode}).`]
    );

    if (vehicle) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'Walk-in Check-in', $2, 'info')`,
        [vehicle.user_id, `Vehicle ${plate} was checked in at ${slot.lot_name}, slot ${slot.slot_number}. Ticket ${ticketCode}.`]
      );
    }

    await client.query('COMMIT');

    broadcastSlotUpdate(slot.lot_id, slot.id, 'occupied', slot.slot_number);
    broadcastGateEvent({
      event: 'ENTRY_CLEARED',
      barrier_status: 'OPENED',
      lot_id: slot.lot_id,
      slot_id: slot.id,
      slot_number: slot.slot_number,
      vehicle_number: plate,
      user_name: 'Walk-in guest',
      timestamp: booking.entry_time
    });

    res.status(201).json({
      success: true,
      message: `Walk-in checked in at slot ${slot.slot_number}.`,
      booking: {
        id: booking.id,
        ticket_code: ticketCode,
        vehicle_number: plate,
        linked_account: !!vehicle,
        lot_name: slot.lot_name,
        slot_number: slot.slot_number,
        floor: slot.floor,
        hourly_price: slot.hourly_price,
        entry_time: booking.entry_time
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * Walk-in (live booking) sessions for the lots the caller operates:
 * everything currently active plus walk-ins completed in the last 24 hours.
 */
export const getWalkInSessions = async (req, res, next) => {
  try {
    const lotIds = await getAccessibleLotIds(req.user);
    const result = await db.query(
      `SELECT b.id, b.booking_status, b.ticket_code, b.entry_time, b.exit_time, b.parking_charge, b.total_amount,
              COALESCE(u.full_name, 'Walk-in guest') AS "userName",
              COALESCE(v.vehicle_number, b.guest_vehicle_number) AS "vehicleNo",
              COALESCE(u.phone, b.guest_phone) AS phone,
              s.slot_number AS "slotCode", s.hourly_price, l.name AS "lotName"
       FROM bookings b
       JOIN parking_slots s ON b.slot_id = s.id
       JOIN parking_lots l ON s.lot_id = l.id
       LEFT JOIN users u ON b.user_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.booking_type = 'walk_in'
         AND s.lot_id = ANY($1::uuid[])
         AND (b.booking_status IN ('active', 'parked')
              OR (b.booking_status = 'completed' AND b.exit_time > CURRENT_TIMESTAMP - INTERVAL '24 hours'))
       ORDER BY (b.booking_status = 'completed'), b.entry_time DESC
       LIMIT 300`,
      [lotIds]
    );
    res.status(200).json({ success: true, sessions: result.rows });
  } catch (err) {
    next(err);
  }
};
