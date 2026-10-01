import express from 'express';
const router = express.Router();
import * as lotController from '../controllers/lotController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

router.get('/', lotController.getAllLots);
router.get('/:id', lotController.getLotById);

// Admin routes
router.post('/', protect, requireRole('ADMIN'), lotController.createLot);
router.put('/:id', protect, requireRole('ADMIN'), lotController.updateLot);

export default router;
