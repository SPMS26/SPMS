import express from 'express';
const router = express.Router();
import * as slotController from '../controllers/slotController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

router.get('/lot/:lotId', slotController.getSlotsByLot);

// Admin slot status update & slot reassignment (FR27)
router.post('/', protect, requireRole('ADMIN'), slotController.createSlot);
router.delete('/:id', protect, requireRole('ADMIN'), slotController.deleteSlot);
router.put('/:id/status', protect, requireRole('ADMIN'), slotController.updateSlotStatus);
router.post('/reassign', protect, requireRole('ADMIN'), slotController.reassignSlot);

export default router;
