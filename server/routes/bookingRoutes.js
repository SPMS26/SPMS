import express from 'express';
const router = express.Router();
import * as bookingController from '../controllers/bookingController.js';
import { protect } from '../middleware/auth.js';

router.use(protect);

router.post('/live-book', bookingController.createLiveBooking);
router.post('/pre-book', bookingController.createPreBooking);
router.get('/', bookingController.getUserBookings);
router.get('/:id', bookingController.getBookingById);

export default router;
