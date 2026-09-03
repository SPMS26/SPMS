const paymentService = require('../services/paymentService');
const db = require('../config/database');

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

    if (booking_id) {
      await db.query('UPDATE bookings SET payment_status = \'paid\', updated_at = CURRENT_TIMESTAMP WHERE id = $1', [booking_id]);
      await db.query(
        `UPDATE payments 
         SET payment_status = 'paid', transaction_reference = $1, paid_at = $2 
         WHERE booking_id = $3`,
        [verification.transactionRef, verification.paidAt, booking_id]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Simulated payment verified successfully!',
      transaction_reference: verification.transactionRef
    });
  } catch (err) {
    next(err);
  }
};

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
