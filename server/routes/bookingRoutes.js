const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/live-book', bookingController.createLiveBooking);
router.post('/pre-book', bookingController.createPreBooking);
router.get('/', bookingController.getUserBookings);
router.get('/:id', bookingController.getBookingById);

module.exports = router;
