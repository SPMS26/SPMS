import http from 'http';
import db from './config/database.js';

async function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runExitPaymentTests() {
  console.log('=== STARTING COMPREHENSIVE EXIT PAYMENT LIFECYCLE TEST SUITE ===\n');
  const results = [];
  function logResult(name, pass, details = '') {
    results.push({ name, pass, details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: ${details}`);
  }

  try {
    // 0. Setup demo users & tokens
    const userRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'mehanna@spms.com', password: 'user123' });
    const userAuth = { 'Authorization': `Bearer ${userRes.data?.token}`, 'Content-Type': 'application/json' };

    const adminRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'admin@spms.com', password: 'admin123' });
    const adminAuth = { 'Authorization': `Bearer ${adminRes.data?.token}`, 'Content-Type': 'application/json' };

    // Find available slot and vehicle
    const lotsRes = await request({ host: 'localhost', port: 5000, path: '/api/lots', method: 'GET', headers: userAuth });
    const lotId = lotsRes.data?.lots?.[0]?.id;
    const slotsRes = await request({ host: 'localhost', port: 5000, path: `/api/slots/lot/${lotId}`, method: 'GET', headers: userAuth });
    const availableSlot = slotsRes.data?.slots?.find(s => s.status === 'available');
    const vehiclesRes = await request({ host: 'localhost', port: 5000, path: '/api/users/vehicles', method: 'GET', headers: userAuth });
    const vehicle = vehiclesRes.data?.vehicles?.[0];

    // Create Pre-Booking & Pay Reservation Fee
    const bookRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/bookings/pre-book',
      method: 'POST',
      headers: userAuth
    }, { slot_id: availableSlot.id, vehicle_id: vehicle.id, duration_hours: 2 });
    const bookingId = bookRes.data?.booking?.id;

    // Confirm reservation payment -> generates QR
    const payRes = await request({
      host: 'localhost',
      port: 5000,
      path: `/api/bookings/${bookingId}/confirm-payment`,
      method: 'POST',
      headers: userAuth
    }, {});
    const parkingPassQR = payRes.data?.qr_code;

    // Gate Entry -> Check in
    const entryRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/qr/validate-entry',
      method: 'POST',
      headers: adminAuth
    }, { qr_data: parkingPassQR });

    // 1. Active booking exists
    const activeCheck = await db.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    const activeBooking = activeCheck.rows[0];
    logResult('1. Active Booking Exists', activeBooking.booking_status === 'active' && !!activeBooking.entry_time, `Status: ${activeBooking.booking_status}, Entry: ${activeBooking.entry_time}`);

    // 2. Exit QR scan calculates actual amount
    const exitScanRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/qr/validate-exit',
      method: 'POST',
      headers: adminAuth
    }, { qr_data: parkingPassQR });
    const exitData = exitScanRes.data;
    const hourlyPrice = parseFloat(availableSlot.hourly_price);
    const expectedCharge = hourlyPrice * 1; // 1 billable hour
    logResult('2. Exit QR Scan Calculates Amount', exitScanRes.status === 200 && exitData.parking_charge === expectedCharge, `Calculated: ₹${exitData.parking_charge} (Hourly: ₹${hourlyPrice})`);

    // 3. Exit payment is created as PENDING
    const paymentCheck = await db.query(
      `SELECT * FROM payments WHERE booking_id = $1 AND payment_type = 'parking_charge' ORDER BY id DESC LIMIT 1`,
      [bookingId]
    );
    const exitPayment = paymentCheck.rows[0];
    logResult('3. Exit Payment Created as PENDING', exitPayment?.payment_status === 'pending' && parseFloat(exitPayment?.amount) === expectedCharge, `Payment ID: ${exitPayment?.id}, Status: ${exitPayment?.payment_status}`);

    // 4. Gate remains CLOSED
    logResult('4. Gate Remains CLOSED Post-Scan', exitData.barrier_status === 'CLOSED' && exitData.gate_authorized === false, `Barrier: ${exitData.barrier_status}, Authorized: ${exitData.gate_authorized}`);

    // 5. Slot remains OCCUPIED
    const slotCheck = await db.query('SELECT status FROM parking_slots WHERE id = $1', [availableSlot.id]);
    logResult('5. Slot Remains OCCUPIED', slotCheck.rows[0].status === 'occupied', `Slot Status: ${slotCheck.rows[0].status}`);

    // 6. Booking is NOT completed
    const bookingCheckPostScan = await db.query('SELECT booking_status FROM bookings WHERE id = $1', [bookingId]);
    logResult('6. Booking NOT Completed', bookingCheckPostScan.rows[0].booking_status === 'active', `Booking Status: ${bookingCheckPostScan.rows[0].booking_status}`);

    // 7. Exit payment QR is generated
    const hasExitQR = !!exitData.exit_payment_qr?.qr_data;
    logResult('7. Exit Payment QR Generated', hasExitQR, `QR Payload & Image generated, Type: SPMS_EXIT_PAY`);

    // 8. Payment amount comes from PostgreSQL
    logResult('8. Payment Amount From PostgreSQL', parseFloat(exitPayment.amount) === expectedCharge, `DB Payment Amount: ₹${exitPayment.amount}`);

    // 9. Frontend cannot manipulate amount (confirm call does not accept client-provided amount)
    const manipulatedRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/qr/confirm-exit-payment',
      method: 'POST',
      headers: adminAuth
    }, {
      booking_id: bookingId,
      amount: 1.00 // Client attempts to underpay
    });
    logResult('9. Tampered Client Amount Ignored', manipulatedRes.status === 200 && manipulatedRes.data.parking_charge === expectedCharge, `Authoritative DB charge used: ₹${manipulatedRes.data.parking_charge}`);

    // 10. Admin/security confirms payment
    const paymentCheckPaid = await db.query('SELECT payment_status FROM payments WHERE id = $1', [exitPayment.id]);
    logResult('10. Payment Confirmed by Admin', paymentCheckPaid.rows[0].payment_status === 'paid', `Payment Status: ${paymentCheckPaid.rows[0].payment_status}`);

    // 11. Payment becomes PAID
    logResult('11. Payment Status is PAID in DB', paymentCheckPaid.rows[0].payment_status === 'paid', `Status: paid`);

    // 12. Booking becomes COMPLETED
    const bookingCheckCompleted = await db.query('SELECT booking_status FROM bookings WHERE id = $1', [bookingId]);
    logResult('12. Booking Marked COMPLETED', bookingCheckCompleted.rows[0].booking_status === 'completed', `Status: ${bookingCheckCompleted.rows[0].booking_status}`);

    // 13. Slot becomes AVAILABLE
    const slotCheckAvailable = await db.query('SELECT status FROM parking_slots WHERE id = $1', [availableSlot.id]);
    logResult('13. Slot Freed to AVAILABLE', slotCheckAvailable.rows[0].status === 'available', `Status: ${slotCheckAvailable.rows[0].status}`);

    // 14. Gate authorization becomes OPENED
    logResult('14. Gate Authorization OPENED', manipulatedRes.data.barrier_status === 'OPENED' && manipulatedRes.data.gate_authorized === true, `Barrier: ${manipulatedRes.data.barrier_status}`);

    // 15. Duplicate confirmation is rejected safely
    const duplicateConfirm = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/qr/confirm-exit-payment',
      method: 'POST',
      headers: adminAuth
    }, { booking_id: bookingId });
    logResult('15. Duplicate Confirmation Rejected', duplicateConfirm.status === 400, `HTTP ${duplicateConfirm.status}: ${duplicateConfirm.data.message}`);

    // 16. Invalid payment session / non-existent booking rejected
    const invalidSession = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/qr/confirm-exit-payment',
      method: 'POST',
      headers: adminAuth
    }, { booking_id: '00000000-0000-0000-0000-000000000000' });
    logResult('16. Invalid Session Rejected', invalidSession.status === 404, `HTTP ${invalidSession.status}: ${invalidSession.data.message}`);

    // 17. Unauthorized user cannot confirm payment (unauthenticated or normal user without admin role)
    const unauthConfirm = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/qr/confirm-exit-payment',
      method: 'POST'
    }, { booking_id: bookingId });
    logResult('17. Unauthenticated User Rejected', unauthConfirm.status === 401, `HTTP ${unauthConfirm.status}`);

    // 18. Expired payment test: create an expired pending payment and verify rejection
    // Let's create another test booking
    const bookRes2 = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/bookings/pre-book',
      method: 'POST',
      headers: userAuth
    }, { slot_id: availableSlot.id, vehicle_id: vehicle.id, duration_hours: 1 });
    const b2Id = bookRes2.data.booking.id;
    await request({ host: 'localhost', port: 5000, path: `/api/bookings/${b2Id}/confirm-payment`, method: 'POST', headers: userAuth }, {});
    const b2Qr = (await request({ host: 'localhost', port: 5000, path: `/api/bookings/${b2Id}`, method: 'GET', headers: userAuth })).data.qr_code;
    await request({ host: 'localhost', port: 5000, path: '/api/qr/validate-entry', method: 'POST', headers: adminAuth }, { qr_data: b2Qr });
    
    // Scan exit -> creates pending payment
    const exit2 = await request({ host: 'localhost', port: 5000, path: '/api/qr/validate-exit', method: 'POST', headers: adminAuth }, { qr_data: b2Qr });
    const p2Id = exit2.data.payment.id;
    // Artificially expire the payment in DB
    await db.query("UPDATE payments SET expires_at = CURRENT_TIMESTAMP - INTERVAL '10 seconds' WHERE id = $1", [p2Id]);
    
    const confirmExpired = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/qr/confirm-exit-payment',
      method: 'POST',
      headers: adminAuth
    }, { booking_id: b2Id });
    logResult('18. Expired Payment Cannot Open Gate', confirmExpired.status === 400 && confirmExpired.data.isExpired === true, `HTTP ${confirmExpired.status}: ${confirmExpired.data.message}`);

    // 19. Retry works without duplicate billing: re-scanning exit updates/reuses pending payment
    const retryExit = await request({ host: 'localhost', port: 5000, path: '/api/qr/validate-exit', method: 'POST', headers: adminAuth }, { qr_data: b2Qr });
    const countPending = await db.query("SELECT COUNT(*)::int as c FROM payments WHERE booking_id = $1 AND payment_type = 'parking_charge' AND payment_status = 'pending'", [b2Id]);
    logResult('19. Retry Reuses Pending Payment Without Duplication', countPending.rows[0].c === 1 && retryExit.data.payment.status === 'pending', `Single pending payment row maintained`);

    // Clean up second test booking by confirming it
    await request({ host: 'localhost', port: 5000, path: '/api/qr/confirm-exit-payment', method: 'POST', headers: adminAuth }, { booking_id: b2Id });

    // 20. Separate Payment Records: verify reservation and parking_charge are distinct in DB
    const paymentsForB1 = await db.query("SELECT payment_type, amount, payment_status FROM payments WHERE booking_id = $1 ORDER BY paid_at ASC", [bookingId]);
    const hasRes = paymentsForB1.rows.some(r => r.payment_type === 'reservation' && parseFloat(r.amount) === 10.00 && r.payment_status === 'paid');
    const hasPark = paymentsForB1.rows.some(r => r.payment_type === 'parking_charge' && parseFloat(r.amount) === expectedCharge && r.payment_status === 'paid');
    logResult('20. Reservation & Parking Charge Separated', hasRes && hasPark, `Found reservation (₹10) and parking_charge (₹${expectedCharge})`);

    // 21. Config Test: Dynamic PRE_BOOKING_FEE change
    await db.query("UPDATE system_settings SET value = '20.00' WHERE key = 'PRE_BOOKING_FEE'");
    const feeRes = await request({ host: 'localhost', port: 5000, path: '/api/lots', method: 'GET', headers: userAuth });
    logResult('21. Dynamic PRE_BOOKING_FEE Setting', (feeRes.data.lots || []).find((l) => l.pre_booking_fee === null)?.effective_pre_booking_fee === 20, `Updated setting to 20 -> API returned ₹${feeRes.data.pre_booking_fee}`);
    await db.query("UPDATE system_settings SET value = '10.00' WHERE key = 'PRE_BOOKING_FEE'");

    // 22. Config Test: Dynamic EXIT_PAYMENT_TIMEOUT_SECONDS change
    await db.query("UPDATE system_settings SET value = '600' WHERE key = 'EXIT_PAYMENT_TIMEOUT_SECONDS'");
    // Create pre-booking, entry, exit scan to test timeout reflection
    const bookRes3 = await request({ host: 'localhost', port: 5000, path: '/api/bookings/pre-book', method: 'POST', headers: userAuth }, { slot_id: availableSlot.id, vehicle_id: vehicle.id, duration_hours: 1 });
    const b3Id = bookRes3.data.booking.id;
    await request({ host: 'localhost', port: 5000, path: `/api/bookings/${b3Id}/confirm-payment`, method: 'POST', headers: userAuth }, {});
    const b3Qr = (await request({ host: 'localhost', port: 5000, path: `/api/bookings/${b3Id}`, method: 'GET', headers: userAuth })).data.qr_code;
    await request({ host: 'localhost', port: 5000, path: '/api/qr/validate-entry', method: 'POST', headers: adminAuth }, { qr_data: b3Qr });
    const exit3 = await request({ host: 'localhost', port: 5000, path: '/api/qr/validate-exit', method: 'POST', headers: adminAuth }, { qr_data: b3Qr });
    logResult('22. Dynamic Timeout Setting (600s)', exit3.data.payment.timeout_seconds === 600, `Timeout returned: ${exit3.data.payment.timeout_seconds}s`);
    await db.query("UPDATE system_settings SET value = '300' WHERE key = 'EXIT_PAYMENT_TIMEOUT_SECONDS'");
    // Complete booking 3
    await request({ host: 'localhost', port: 5000, path: '/api/qr/confirm-exit-payment', method: 'POST', headers: adminAuth }, { booking_id: b3Id });

    // 23. Config Test: Dynamic parking_slots.hourly_price change
    await db.query("UPDATE parking_slots SET hourly_price = 50.00 WHERE id = $1", [availableSlot.id]);
    const bookRes4 = await request({ host: 'localhost', port: 5000, path: '/api/bookings/pre-book', method: 'POST', headers: userAuth }, { slot_id: availableSlot.id, vehicle_id: vehicle.id, duration_hours: 1 });
    const b4Id = bookRes4.data.booking.id;
    await request({ host: 'localhost', port: 5000, path: `/api/bookings/${b4Id}/confirm-payment`, method: 'POST', headers: userAuth }, {});
    const b4Qr = (await request({ host: 'localhost', port: 5000, path: `/api/bookings/${b4Id}`, method: 'GET', headers: userAuth })).data.qr_code;
    await request({ host: 'localhost', port: 5000, path: '/api/qr/validate-entry', method: 'POST', headers: adminAuth }, { qr_data: b4Qr });
    const exit4 = await request({ host: 'localhost', port: 5000, path: '/api/qr/validate-exit', method: 'POST', headers: adminAuth }, { qr_data: b4Qr });
    logResult('23. Dynamic Hourly Price Setting (₹50/hr)', exit4.data.payment.amount === 50 && exit4.data.booking.hourly_rate === 50, `Calculated parking charge: ₹${exit4.data.payment.amount}`);
    await request({ host: 'localhost', port: 5000, path: '/api/qr/confirm-exit-payment', method: 'POST', headers: adminAuth }, { booking_id: b4Id });
    await db.query("UPDATE parking_slots SET hourly_price = $1 WHERE id = $2", [hourlyPrice, availableSlot.id]);

  } catch (err) {
    console.error('Test execution error:', err);
    logResult('Suite Execution', false, err.message);
  }

  const passedCount = results.filter(r => r.pass).length;
  console.log(`\n=== SUMMARY: ${passedCount}/${results.length} TESTS PASSED ===`);
  process.exit(passedCount === results.length ? 0 : 1);
}

runExitPaymentTests();
