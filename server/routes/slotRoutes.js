const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/lot/:lotId', slotController.getSlotsByLot);

// Admin slot status update & slot reassignment (FR27)
router.put('/:id/status', protect, requireRole('ADMIN'), slotController.updateSlotStatus);
router.post('/reassign', protect, requireRole('ADMIN'), slotController.reassignSlot);

module.exports = router;
