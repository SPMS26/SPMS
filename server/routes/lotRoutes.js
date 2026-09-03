const express = require('express');
const router = express.Router();
const lotController = require('../controllers/lotController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/', lotController.getAllLots);
router.get('/:id', lotController.getLotById);

// Admin routes
router.post('/', protect, requireRole('ADMIN'), lotController.createLot);
router.put('/:id', protect, requireRole('ADMIN'), lotController.updateLot);

module.exports = router;
