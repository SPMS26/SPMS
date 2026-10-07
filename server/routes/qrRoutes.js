import express from 'express';
const router = express.Router();
import * as qrController from '../controllers/qrController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

// Gate operations belong to gate staff (SECURITY) only. Lot owners manage the business but do not run the gate.
// Lot scoping (a guard can only act on their assigned lot) is enforced in the controller.
const gateStaff = [protect, requireRole('SECURITY')];

router.post('/validate-entry', ...gateStaff, qrController.validateEntry);
router.post('/validate-exit', ...gateStaff, qrController.validateExit);
router.post('/confirm-exit-payment', ...gateStaff, qrController.confirmExitPayment);
router.post('/auto-validate', ...gateStaff, qrController.autoValidate);
router.post('/walk-in', ...gateStaff, qrController.walkInCheckIn);
router.get('/gate-queue', ...gateStaff, qrController.getGateQueue);
router.get('/walk-ins', ...gateStaff, qrController.getWalkInSessions);

// Drivers fetch their own pass; staff of the owning lot may also view it
router.get('/booking/:bookingId', protect, qrController.getLiveQR);

export default router;
