import express from 'express';
const router = express.Router();
import * as bookingController from '../controllers/bookingController.js';
import { protect } from '../middleware/auth.js';
import { bookingLimiter } from '../middleware/rateLimit.js';


router.use(protect);

router.post('/pre-book', bookingLimiter, bookingController.createPreBooking);
router.post('/:id/confirm-payment', bookingLimiter, bookingController.confirmPreBookingPayment);
router.post('/:id/cancel', bookingLimiter, bookingController.cancelBooking);
router.get('/', bookingController.getUserBookings);
router.get('/:id', bookingController.getBookingById);

export default router;
