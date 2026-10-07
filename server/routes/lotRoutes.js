import express from 'express';
const router = express.Router();
import * as lotController from '../controllers/lotController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

router.get('/', lotController.getAllLots);
router.get('/mine', protect, requireRole('ADMIN'), lotController.getMyLots);
router.get('/:id', lotController.getLotById);

// Admin (lot owner) routes - ownership is enforced inside the controllers
router.post('/', protect, requireRole('ADMIN'), lotController.createLot);
router.put('/:id', protect, requireRole('ADMIN'), lotController.updateLot);
router.delete('/:id', protect, requireRole('ADMIN'), lotController.deleteLot);

export default router;
