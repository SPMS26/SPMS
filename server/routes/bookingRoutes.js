const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

const qrController = require('../controllers/qrController');

router.use(protect);

router.get('/config', bookingController.getBookingConfig);
router.get('/my', bookingController.getUserBookings);
router.post('/', bookingController.createPreBooking);
router.post('/live-book', bookingController.createLiveBooking);
router.post('/pre-book', bookingController.createPreBooking);
router.post('/confirm-payment', bookingController.confirmPreBookingPayment);
router.post('/:id/confirm-payment', bookingController.confirmPreBookingPayment);
router.post('/:id/confirm-exit-payment', qrController.confirmExitPayment);
router.get('/', bookingController.getUserBookings);
router.get('/:id', bookingController.getBookingById);

module.exports = router;

