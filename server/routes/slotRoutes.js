import express from 'express';
const router = express.Router();
import * as slotController from '../controllers/slotController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

router.get('/lot/:lotId', slotController.getSlotsByLot);

// Admin slot status update & slot reassignment (FR27)
router.post('/', protect, requireRole('ADMIN'), slotController.createSlot);
router.post('/bulk', protect, requireRole('ADMIN'), slotController.bulkCreateSlots);
router.delete('/:id', protect, requireRole('ADMIN'), slotController.deleteSlot);
router.put('/:id/status', protect, requireRole('ADMIN', 'SECURITY'), slotController.updateSlotStatus);
router.post('/reassign', protect, requireRole('ADMIN', 'SECURITY'), slotController.reassignSlot);

export default router;
