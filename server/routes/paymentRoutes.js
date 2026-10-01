import express from 'express';
const router = express.Router();
import * as paymentController from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

router.use(protect);

router.post('/create-order', paymentController.createPaymentOrder);
router.post('/verify', paymentController.verifyPayment);
router.post('/pay', paymentController.verifyPayment);
router.get('/history', paymentController.getPaymentHistory);

export default router;
