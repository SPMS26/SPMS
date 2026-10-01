const paymentService = require('../services/paymentService');
const db = require('../config/database');
const { generateQRPayload, renderQRDataURL } = require('../services/qrGenerator');
const { broadcastSlotUpdate } = require('../socket/socketManager');

exports.createPaymentOrder = async (req, res, next) => {
  try {
    const { booking_id, amount } = req.body;
    const order = await paymentService.createOrder(amount, booking_id);

    res.status(200).json({
      success: true,
      order
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { order_id, booking_id } = req.body;
    const verification = await paymentService.verifyPayment(order_id);

    let qrCode = null;
    let qrImage = null;

    if (booking_id) {
      await db.query(
        `UPDATE bookings 
         SET payment_status = 'paid',
             booking_status = CASE WHEN booking_status = 'pending_payment' THEN 'reserved' ELSE booking_status END,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [booking_id]
      );
      await db.query(
        `UPDATE payments 
         SET payment_status = 'paid', transaction_reference = $1, paid_at = $2 
         WHERE booking_id = $3 AND payment_status = 'pending'`,
        [verification.transactionRef, verification.paidAt, booking_id]
      );

      // Check if QR code already exists
      const qrCheck = await db.query('SELECT * FROM qr_codes WHERE booking_id = $1', [booking_id]);
      if (qrCheck.rows.length === 0) {
        // Fetch booking and related details to generate QR pass
        const bRes = await db.query(
          `SELECT b.*, u.full_name as user_name, v.vehicle_number, v.vehicle_type,
                  s.slot_number, s.floor, s.section, s.hourly_price, s.lot_id,
                  l.name as lot_name
           FROM bookings b
           JOIN users u ON b.user_id = u.id
           JOIN vehicles v ON b.vehicle_id = v.id
           JOIN parking_slots s ON b.slot_id = s.id
           JOIN parking_lots l ON s.lot_id = l.id
           WHERE b.id = $1`,
          [booking_id]
        );
        if (bRes.rows.length > 0) {
          const booking = bRes.rows[0];
          const bookingEnd = booking.booking_end ? new Date(booking.booking_end) : new Date(Date.now() + 2 * 3600 * 1000);
          const expiresAt = new Date(bookingEnd.getTime() + 2 * 3600 * 1000);

          const { payloadString, signatureHash } = generateQRPayload(
            booking,
            { id: booking.slot_id, slot_number: booking.slot_number, floor: booking.floor, section: booking.section, hourly_price: booking.hourly_price },
            { id: booking.lot_id, name: booking.lot_name },
            { id: booking.user_id, full_name: booking.user_name },
            { id: booking.vehicle_id, vehicle_number: booking.vehicle_number, vehicle_type: booking.vehicle_type },
            { expiresAt }
          );
          qrCode = payloadString;
          qrImage = await renderQRDataURL(payloadString);

          await client_query_safe(db, booking.id, signatureHash, expiresAt);
          broadcastSlotUpdate(booking.lot_id, booking.slot_id, 'reserved', booking.slot_number);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Simulated payment verified successfully!',
      transaction_reference: verification.transactionRef,
      payment: {
        payment_status: 'paid',
        transaction_reference: verification.transactionRef
      },
      qr_code: qrCode,
      qr_image: qrImage
    });
  } catch (err) {
    next(err);
  }
};

async function client_query_safe(db, bookingId, signatureHash, expiresAt) {
  await db.query(
    `INSERT INTO qr_codes (booking_id, signature_hash, version, is_active, generated_at, expires_at)
     VALUES ($1, $2, 1, true, CURRENT_TIMESTAMP, $3)`,
    [bookingId, signatureHash, expiresAt]
  );
}

exports.getPaymentHistory = async (req, res, next) => {
  try {
    const queryStr = `
      SELECT p.*, b.booking_type, b.booking_status
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE b.user_id = $1
      ORDER BY p.paid_at DESC
    `;
    const result = await db.query(queryStr, [req.user.id]);

    res.status(200).json({ success: true, payments: result.rows });
  } catch (err) {
    next(err);
  }
};
