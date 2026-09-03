const db = require('../config/database');
const { generateQRPayload, verifyQRPayload, renderQRDataURL } = require('../services/qrGenerator');
const { broadcastSlotUpdate, broadcastGateEvent } = require('../socket/socketManager');

/**
 * Robust Helper to resolve target booking from QR payload, pass code, vehicle plate, or UUID
 */
async function findBookingForValidation(input, isExit = false) {
  if (!input) return null;
  const trimmed = typeof input === 'string' ? input.trim() : String(input);

  let targetBookingId = null;
  let targetPassCode = null;
  let targetPlate = null;
  let isSignatureVerified = false;

  // 1. If JSON payload, verify HMAC signature & extract metadata
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const verification = verifyQRPayload(trimmed);
      if (verification.isExpired) {
        return { isExpired: true, payload: verification.payload, reason: verification.reason };
      }
      if (verification.isValid && verification.payload) {
        isSignatureVerified = true;
      }
      const parsed = JSON.parse(trimmed);
      targetBookingId = parsed.bookingId || parsed.booking_id || parsed.id;
      targetPassCode = parsed.passCode || parsed.pass_code || parsed.code;
      targetPlate = parsed.vehicleNumber || parsed.vehicle_number;
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
      `SELECT b.*, u.full_name as user_name, v.vehicle_number, v.vehicle_model, s.slot_number, s.lot_id, s.floor, s.hourly_price, l.name as lot_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN parking_slots s ON b.slot_id = s.id
       JOIN parking_lots l ON s.lot_id = l.id
       WHERE b.id = $1`,
      [targetBookingId]
    );
    if (res.rows.length > 0) {
      return { booking: res.rows[0], verified: isSignatureVerified };
    }
  }

  // 4. Pass Code Lookup (e.g. BK-B0057365 or B0057365)
  const codeToSearch = targetPassCode || trimmed;
  const cleanCode = codeToSearch.replace(/^BK-/i, '').replace(/[^a-zA-Z0-9]/g, '');
  if (cleanCode.length >= 4) {
    const res = await db.query(
      `SELECT b.*, u.full_name as user_name, v.vehicle_number, v.vehicle_model, s.slot_number, s.lot_id, s.floor, s.hourly_price, l.name as lot_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN vehicles v ON b.vehicle_id = v.id
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
      `SELECT b.*, u.full_name as user_name, v.vehicle_number, v.vehicle_model, s.slot_number, s.lot_id, s.floor, s.hourly_price, l.name as lot_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN parking_slots s ON b.slot_id = s.id
       JOIN parking_lots l ON s.lot_id = l.id
       WHERE REPLACE(REPLACE(v.vehicle_number, ' ', ''), '-', '') ILIKE $1
         AND b.booking_status = ANY($2::varchar[])
       ORDER BY b.created_at DESC LIMIT 1`,
      [`%${normalizedPlate}%`, targetStatuses]
    );
    if (res.rows.length > 0) {
      return { booking: res.rows[0], verified: isSignatureVerified };
    }
  }

  return null;
}

/**
 * Gate Keeper / Admin Validate Entry (Req-7, Req-8)
 */
exports.validateEntry = async (req, res, next) => {
  try {
    const { qr_data, booking_id, pass_code, vehicle_number } = req.body;
    const inputIdentifier = qr_data || booking_id || pass_code || vehicle_number;

    if (!inputIdentifier) {
      return res.status(400).json({ success: false, message: 'Please scan a QR code or enter a pass code/vehicle number.' });
    }

    const lookup = await findBookingForValidation(inputIdentifier, false);

    if (lookup && lookup.isExpired) {
      return res.status(400).json({
        success: false,
        isExpired: true,
        message: `❌ QR Pass Expired! Valid window was until ${new Date(lookup.payload?.expiresAt).toLocaleTimeString()}. Entry denied.`
      });
    }

    if (!lookup || !lookup.booking) {
      return res.status(404).json({
        success: false,
        message: '❌ No active reservation found for this QR pass or vehicle plate.'
      });
    }

    const booking = lookup.booking;

    // Check if session is already completed
    if (booking.booking_status === 'completed' || booking.booking_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        isExpired: true,
        message: `❌ QR Pass Expired! This parking session is already completed and cannot be reused.`
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
          message: '❌ QR Pass Expired! This pass has already been used and deactivated.'
        });
      }
      if (qrRecord.expires_at && new Date(qrRecord.expires_at) < new Date()) {
        await db.query('UPDATE qr_codes SET is_active = false WHERE id = $1', [qrRecord.id]);
        return res.status(400).json({
          success: false,
          isExpired: true,
          message: `❌ QR Pass Expired! Validity ended on ${new Date(qrRecord.expires_at).toLocaleString()}. Entry denied.`
        });
      }
    }

    if (booking.booking_status === 'active' || booking.booking_status === 'parked') {
      return res.status(400).json({
        success: false,
        message: `⚠️ Vehicle ${booking.vehicle_number} is already checked in at Slot ${booking.slot_number}.`
      });
    }

    // Mark booking active & slot occupied
    const entryTime = new Date();
    await db.query(
      `UPDATE bookings 
       SET booking_status = 'active', entry_time = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [entryTime, booking.id]
    );

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

    // User Notification
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Gate Entry Verified', $2, 'info')`,
      [booking.user_id, `Vehicle ${booking.vehicle_number} entered ${booking.lot_name} at ${entryTime.toLocaleTimeString()}. Head to Slot ${booking.slot_number} (${booking.floor}).`]
    );

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
      message: '✅ Gate Entry Approved! Barrier Opening.',
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
 * Gate Keeper / Admin Validate Exit (Req-7, Req-8)
 */
exports.validateExit = async (req, res, next) => {
  try {
    const { qr_data, booking_id, pass_code, vehicle_number } = req.body;
    const inputIdentifier = qr_data || booking_id || pass_code || vehicle_number;

    if (!inputIdentifier) {
      return res.status(400).json({ success: false, message: 'Please scan a QR code or enter a pass code/vehicle number.' });
    }

    const lookup = await findBookingForValidation(inputIdentifier, true);

    if (!lookup || !lookup.booking) {
      return res.status(404).json({
        success: false,
        message: '❌ No active parked booking found matching this QR code or vehicle plate.'
      });
    }

    const booking = lookup.booking;

    if (booking.booking_status === 'completed' || booking.booking_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        isExpired: true,
        message: `❌ QR Pass Expired! This parking session has already been completed and checked out.`
      });
    }

    const exitTime = new Date();
    const entryTime = booking.entry_time || booking.created_at || new Date(Date.now() - 30 * 60000);
    const durationMs = Math.max(1000, exitTime.getTime() - new Date(entryTime).getTime());
    const durationMinutes = Math.max(1, Math.ceil(durationMs / 60000));
    const durationHours = Math.max(1, Math.ceil(durationMinutes / 60));

    const hourlyRate = parseFloat(booking.hourly_price || 30.00);
    const calculatedFee = durationHours * hourlyRate;

    // Complete booking session
    await db.query(
      `UPDATE bookings 
       SET booking_status = 'completed', exit_time = $1, duration_minutes = $2, total_amount = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [exitTime, durationMinutes, calculatedFee, booking.id]
    );

    // Free the parking slot
    await db.query(
      `UPDATE parking_slots 
       SET status = 'available', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [booking.slot_id]
    );

    // Expire/Deactivate the QR pass permanently
    await db.query('UPDATE qr_codes SET is_active = false WHERE booking_id = $1', [booking.id]);

    const operatorName = req.user?.full_name || 'Autonomous Gate Terminal';
    const operatorId = req.user?.id || booking.user_id;

    if (operatorId) {
      try {
        await db.query(
          `INSERT INTO admin_logs (admin_id, action, target_table, target_id, description)
           VALUES ($1, 'GATE_EXIT_CHECKOUT', 'bookings', $2, $3)`,
          [operatorId, booking.id, `Gate Exit verified by ${operatorName} for ${booking.user_name} (${booking.vehicle_number}). Slot ${booking.slot_number} freed. Duration: ${durationMinutes} mins.`]
        );
      } catch (logErr) {
        console.warn('Admin log skipped:', logErr.message);
      }
    }

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, 'Gate Exit Completed', $2, 'payment')`,
      [booking.user_id, `Vehicle ${booking.vehicle_number} exited ${booking.lot_name}. Duration: ${durationMinutes} mins. Total charge: ₹${calculatedFee}.00.`]
    );

    broadcastSlotUpdate(booking.lot_id, booking.slot_id, 'available', booking.slot_number);

    const gateEventData = {
      event: 'EXIT_CLEARED',
      barrier_status: 'OPENED',
      lot_id: booking.lot_id,
      slot_id: booking.slot_id,
      slot_number: booking.slot_number,
      vehicle_number: booking.vehicle_number,
      user_name: booking.user_name,
      timestamp: exitTime
    };
    broadcastGateEvent(gateEventData);

    res.status(200).json({
      success: true,
      message: '✅ Gate Exit Approved! Barrier Opened.',
      barrier_status: 'OPENED',
      action: 'EXIT',
      booking_id: booking.id,
      pass_code: `BK-${booking.id.substring(0, 8).toUpperCase()}`,
      user_name: booking.user_name,
      vehicle_number: booking.vehicle_number,
      slot_freed: booking.slot_number,
      floor: booking.floor,
      lot_name: booking.lot_name,
      entry_time: entryTime,
      exit_time: exitTime,
      duration_minutes: durationMinutes,
      total_fee: calculatedFee,
      operator: operatorName
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get live QR pass data and rendered PNG Base64 image by Booking ID
 */
exports.getLiveQR = async (req, res, next) => {
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
    const isOwner = req.user && (req.user.id === booking.user_id || req.user.role === 'ADMIN');
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this QR pass.' });
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
exports.getGateQueue = async (req, res, next) => {
  try {
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
       ORDER BY b.created_at DESC`
    );

    const parkedRes = await db.query(
      `SELECT b.id, b.booking_status, b.entry_time, b.created_at, b.booking_type, b.total_amount,
              u.full_name as "userName", u.phone,
              v.vehicle_number as "vehicleNo", v.vehicle_model,
              s.slot_number as "slotCode", s.floor, s.hourly_price,
              l.name as "lotName"
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN parking_slots s ON b.slot_id = s.id
       JOIN parking_lots l ON s.lot_id = l.id
       WHERE b.booking_status IN ('active', 'parked')
       ORDER BY b.entry_time DESC`
    );

    res.status(200).json({
      success: true,
      pending_arrivals: arrivalsRes.rows.map(r => ({
        ...r,
        bookingId: `BK-${r.id.substring(0, 8).toUpperCase()}`
      })),
      active_parked: parkedRes.rows.map(r => ({
        ...r,
        bookingId: `BK-${r.id.substring(0, 8).toUpperCase()}`
      }))
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Autonomous Unattended Gate Verification (Auto-Detect Entry vs Exit)
 */
exports.autoValidate = async (req, res, next) => {
  try {
    const { qr_data, booking_id, pass_code, vehicle_number, preferred_mode } = req.body;
    const inputIdentifier = qr_data || booking_id || pass_code || vehicle_number;

    if (!inputIdentifier) {
      return res.status(400).json({ success: false, message: 'Please present a QR pass in front of the camera.' });
    }

    // Attempt lookup
    let lookup = await findBookingForValidation(inputIdentifier, false);
    if (!lookup || !lookup.booking) {
      lookup = await findBookingForValidation(inputIdentifier, true);
    }

    if (lookup && lookup.isExpired) {
      return res.status(400).json({
        success: false,
        isExpired: true,
        message: `❌ QR Pass Expired! This pass has expired and cannot be used.`
      });
    }

    if (!lookup || !lookup.booking) {
      return res.status(404).json({
        success: false,
        message: '❌ Access Denied: No valid reservation or vehicle record found in system.'
      });
    }

    const booking = lookup.booking;

    // Check if session is already completed
    if (booking.booking_status === 'completed' || booking.booking_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        isExpired: true,
        message: `❌ QR Pass Expired! This parking session is already completed and cannot be reused.`
      });
    }

    // Check preferred mode or auto-determine based on booking_status
    const isArrival = preferred_mode === 'entry' ? true : (preferred_mode === 'exit' ? false : (booking.booking_status === 'reserved'));

    if (isArrival) {
      // Run Entry validation flow
      return exports.validateEntry(req, res, next);
    } else {
      // Run Exit validation flow
      return exports.validateExit(req, res, next);
    }
  } catch (err) {
    next(err);
  }
};
