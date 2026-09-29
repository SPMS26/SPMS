import express from 'express';
const router = express.Router();
import * as qrController from '../controllers/qrController.js';
import { protect } from '../middleware/auth.js';

router.post('/validate-entry', protect, qrController.validateEntry);
router.post('/validate-exit', protect, qrController.validateExit);
router.post('/auto-validate', protect, qrController.autoValidate);
router.get('/booking/:bookingId', protect, qrController.getLiveQR);
router.get('/gate-queue', protect, qrController.getGateQueue);

export default router;
