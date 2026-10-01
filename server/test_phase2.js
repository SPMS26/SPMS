const http = require('http');

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

async function runPhase2Tests() {
  console.log('=== STARTING PHASE 2 AUTOMATED TEST SUITE ===\n');
  const results = [];
  function logResult(name, pass, details = '') {
    results.push({ name, pass, details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: ${details}`);
  }

  try {
    // 1. Healthcheck
    const health = await request({ host: 'localhost', port: 5000, path: '/api/health', method: 'GET' });
    logResult('Backend Healthcheck', health.status === 200, `Status: ${health.status}`);

    // 2. Login as demo user
    const loginRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'mehanna@spms.com', password: 'user123' });
    
    const userToken = loginRes.data?.token;
    const userAuth = { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' };
    logResult('User Auth', !!userToken, `Logged in as mehanna@spms.com`);

    // 3. Login as demo admin
    const adminLoginRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'admin@spms.com', password: 'admin123' });
    const adminToken = adminLoginRes.data?.token;
    const adminAuth = { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
    logResult('Admin Auth', !!adminToken, `Logged in as admin@spms.com`);

    // 4. Test dynamic pre-booking fee endpoint
    const configRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/bookings/config',
      method: 'GET',
      headers: userAuth
    });
    const preBookingFee = configRes.data?.pre_booking_fee;
    logResult('Dynamic Fee Config API', configRes.status === 200 && preBookingFee === 10, `Returned pre_booking_fee: ₹${preBookingFee}`);

    // 5. Pick an available slot and vehicle
    const lotsRes = await request({ host: 'localhost', port: 5000, path: '/api/lots', method: 'GET', headers: userAuth });
    const lotId = lotsRes.data?.lots?.[0]?.id;
    const slotsRes = await request({ host: 'localhost', port: 5000, path: `/api/slots/lot/${lotId}`, method: 'GET', headers: userAuth });
    const availableSlot = slotsRes.data?.slots?.find(s => s.status === 'available');
    
    const vehiclesRes = await request({ host: 'localhost', port: 5000, path: '/api/users/vehicles', method: 'GET', headers: userAuth });
    const vehicle = vehiclesRes.data?.vehicles?.[0];

    logResult('Resource Selection', !!availableSlot && !!vehicle, `Slot: ${availableSlot?.slot_number} (Hourly Price: ₹${availableSlot?.hourly_price}), Vehicle: ${vehicle?.vehicle_number}`);

    // 6. Create Pre-Booking (Stage 1)
    const preBookPayload = {
      slot_id: availableSlot.id,
      vehicle_id: vehicle.id,
      duration_hours: 2
    };
    const preBookRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/bookings/pre-book',
      method: 'POST',
      headers: userAuth
    }, preBookPayload);

    const booking = preBookRes.data?.booking;
    const isStage1Correct = preBookRes.status === 201 &&
      booking?.booking_status === 'pending_payment' &&
      booking?.payment_status === 'pending' &&
      parseFloat(booking?.pre_booking_fee) === 10.00 &&
      preBookRes.data?.qr_code === null &&
      preBookRes.data?.qr_image === null;

    logResult('Pre-Booking Creation (Stage 1)', isStage1Correct, `Status: ${booking?.booking_status}, Payment: ${booking?.payment_status}, Fee: ₹${booking?.pre_booking_fee}`);

    // 7. Verify QR is WITHHELD before reservation payment
    const qrBeforePayment = await request({
      host: 'localhost',
      port: 5000,
      path: `/api/qr/booking/${booking.id}`,
      method: 'GET',
      headers: userAuth
    });
    logResult('QR Withheld Before Payment (/api/qr/booking/:id)', qrBeforePayment.status === 402 && qrBeforePayment.data?.payment_required === true, `HTTP ${qrBeforePayment.status} Payment Required`);

    const bookingDetailBeforePayment = await request({
      host: 'localhost',
      port: 5000,
      path: `/api/bookings/${booking.id}`,
      method: 'GET',
      headers: userAuth
    });
    logResult('QR Withheld in Booking Details (/api/bookings/:id)', bookingDetailBeforePayment.data?.qr_code === null && bookingDetailBeforePayment.data?.payment_required === true, `qr_code is null, payment_required: true`);

    // 8. Verify Gate Entry is DENIED before payment
    const prematureEntry = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/qr/validate-entry',
      method: 'POST',
      headers: adminAuth
    }, { booking_id: booking.id });
    logResult('Gate Entry Denied for Unpaid Booking', prematureEntry.status === 400, `HTTP ${prematureEntry.status}: ${prematureEntry.data?.message}`);

    // 9. Confirm Pre-Booking Reservation Payment (Stage 2)
    const confirmPaymentRes = await request({
      host: 'localhost',
      port: 5000,
      path: `/api/bookings/${booking.id}/confirm-payment`,
      method: 'POST',
      headers: userAuth
    }, { transaction_reference: `TEST-PRE-${Date.now()}` });

    const confirmedBooking = confirmPaymentRes.data?.booking;
    const qrCode = confirmPaymentRes.data?.qr_code;
    const qrImage = confirmPaymentRes.data?.qr_image;
    const isPaymentConfirmed = confirmPaymentRes.status === 200 &&
      confirmedBooking?.booking_status === 'reserved' &&
      confirmedBooking?.payment_status === 'paid' &&
      !!qrCode &&
      !!qrImage;

    logResult('Reservation Payment Confirmation (Stage 2)', isPaymentConfirmed, `Booking Status: ${confirmedBooking?.booking_status}, QR Pass Generated: ${!!qrCode}`);

    // 10. Verify QR pass is now ACCESSIBLE
    const qrAfterPayment = await request({
      host: 'localhost',
      port: 5000,
      path: `/api/qr/booking/${booking.id}`,
      method: 'GET',
      headers: userAuth
    });
    logResult('QR Pass Accessible After Payment', qrAfterPayment.status === 200 && !!qrAfterPayment.data?.qr?.qr_data, `HTTP 200, QR signature active`);

    // 11. Verify Premature Exit is REJECTED before Gate Entry
    const prematureExit = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/qr/validate-exit',
      method: 'POST',
      headers: adminAuth
    }, { booking_id: booking.id });
    logResult('Premature Gate Exit Denied (No Entry Recorded)', prematureExit.status === 400, `HTTP ${prematureExit.status}: ${prematureExit.data?.message}`);

    // 12. Validate Gate Entry Check-in
    const gateEntryRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/qr/validate-entry',
      method: 'POST',
      headers: adminAuth
    }, { qr_data: qrCode });

    const isEntrySuccess = gateEntryRes.status === 200 &&
      gateEntryRes.data?.action === 'ENTRY' &&
      gateEntryRes.data?.barrier_status === 'OPENED' &&
      !!gateEntryRes.data?.entry_time;

    logResult('Gate Entry Check-in', isEntrySuccess, `Barrier: ${gateEntryRes.data?.barrier_status}, Entry Time: ${gateEntryRes.data?.entry_time}`);

    // 13. Verify Slot Status is OCCUPIED
    const slotAfterEntry = await request({ host: 'localhost', port: 5000, path: `/api/slots/lot/${lotId}`, method: 'GET', headers: userAuth });
    const slotInDb = slotAfterEntry.data?.slots?.find(s => s.id === availableSlot.id);
    logResult('Slot Occupied Post-Entry', slotInDb?.status === 'occupied', `Slot ${slotInDb?.slot_number} status: ${slotInDb?.status}`);

    // 14. Verify Duplicate Gate Entry is REJECTED
    const duplicateEntry = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/qr/validate-entry',
      method: 'POST',
      headers: adminAuth
    }, { qr_data: qrCode });
    logResult('Duplicate Gate Entry Denied', duplicateEntry.status === 400, `HTTP ${duplicateEntry.status}: ${duplicateEntry.data?.message}`);

    // 15. Validate Gate Exit Check-out (Two-Step: Pending Payment + Confirmation)
    const gateExitRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/qr/validate-exit',
      method: 'POST',
      headers: adminAuth
    }, { qr_data: qrCode });

    const exitData = gateExitRes.data;
    const slotHourlyPrice = parseFloat(availableSlot.hourly_price);
    const expectedHours = Math.ceil((exitData?.booking?.duration_minutes || exitData?.duration_minutes || 1) / 60) || 1;
    const expectedParkingCharge = expectedHours * slotHourlyPrice;
    const expectedTotal = parseFloat((10.00 + expectedParkingCharge).toFixed(2));

    const isExitScanSuccess = gateExitRes.status === 200 &&
      exitData?.action === 'PAYMENT_REQUIRED' &&
      exitData?.barrier_status === 'CLOSED' &&
      exitData?.payment?.status === 'pending' &&
      exitData?.parking_charge === expectedParkingCharge &&
      !!exitData?.exit_payment_qr?.qr_data;

    // Confirm exit payment
    const confirmExitRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/qr/confirm-exit-payment',
      method: 'POST',
      headers: adminAuth
    }, { booking_id: booking.id });

    const isExitSuccess = isExitScanSuccess &&
      confirmExitRes.status === 200 &&
      confirmExitRes.data?.barrier_status === 'OPENED' &&
      confirmExitRes.data?.parking_charge === expectedParkingCharge &&
      confirmExitRes.data?.total_amount === expectedTotal;

    logResult('Gate Exit Check-out & Calculations', isExitSuccess, `Scan: CLOSED (₹${exitData?.parking_charge} pending) -> Confirm: OPENED (Total: ₹${confirmExitRes.data?.total_amount})`);

    // 16. Verify Slot Status is Released back to AVAILABLE
    const slotAfterExit = await request({ host: 'localhost', port: 5000, path: `/api/slots/lot/${lotId}`, method: 'GET', headers: userAuth });
    const slotInDbAfterExit = slotAfterExit.data?.slots?.find(s => s.id === availableSlot.id);
    logResult('Slot Freed Post-Exit', slotInDbAfterExit?.status === 'available', `Slot ${slotInDbAfterExit?.slot_number} status: ${slotInDbAfterExit?.status}`);

    // 17. Verify QR Deactivated
    const qrAfterExit = await request({
      host: 'localhost',
      port: 5000,
      path: `/api/qr/booking/${booking.id}`,
      method: 'GET',
      headers: userAuth
    });
    logResult('QR Pass Deactivated Post-Exit', qrAfterExit.data?.qr?.is_active === false || qrAfterExit.data?.qr?.is_expired === true, `is_active: ${qrAfterExit.data?.qr?.is_active}, is_expired: ${qrAfterExit.data?.qr?.is_expired}`);

    // 18. Verify Duplicate Gate Exit is REJECTED
    const duplicateExit = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/qr/validate-exit',
      method: 'POST',
      headers: adminAuth
    }, { qr_data: qrCode });
    logResult('Duplicate Gate Exit Denied', duplicateExit.status === 400, `HTTP ${duplicateExit.status}: ${duplicateExit.data?.message}`);

    // 19. Verify Separate Payment Records in Database
    const paymentsRes = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/payments/history',
      method: 'GET',
      headers: userAuth
    });
    const bookingPayments = paymentsRes.data?.payments?.filter(p => p.booking_id === booking.id);
    const hasReservationPayment = bookingPayments?.some(p => p.payment_type === 'reservation' && parseFloat(p.amount) === 10.00 && p.payment_status === 'paid');
    const hasParkingChargePayment = bookingPayments?.some(p => p.payment_type === 'parking_charge' && parseFloat(p.amount) === expectedParkingCharge && p.payment_status === 'paid');

    logResult('Separate Payment Records', hasReservationPayment && hasParkingChargePayment, `Found reservation (₹10) and parking_charge (₹${expectedParkingCharge})`);

    // 20. Non-Hardcoding Proof: Update system_settings to ₹25 and verify API returns ₹25
    const db = require('../server/config/database');
    await db.query("UPDATE system_settings SET value = '25.00' WHERE key = 'PRE_BOOKING_FEE'");
    const updatedConfig = await request({ host: 'localhost', port: 5000, path: '/api/bookings/config', method: 'GET', headers: userAuth });
    const isFeeDynamic = updatedConfig.data?.pre_booking_fee === 25;
    logResult('Non-Hardcoding Proof (system_settings ₹25 test)', isFeeDynamic, `Updated setting to 25.00 -> API returned: ₹${updatedConfig.data?.pre_booking_fee}`);
    // Restore to 10.00
    await db.query("UPDATE system_settings SET value = '10.00' WHERE key = 'PRE_BOOKING_FEE'");

  } catch (err) {
    console.error('Test execution error:', err);
    logResult('Suite Execution', false, err.message);
  }

  const passedCount = results.filter(r => r.pass).length;
  console.log(`\n=== SUMMARY: ${passedCount}/${results.length} TESTS PASSED ===`);
  process.exit(passedCount === results.length ? 0 : 1);
}

runPhase2Tests();
