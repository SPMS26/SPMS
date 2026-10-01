import express from 'express';
const router = express.Router();
import * as adminController from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

router.use(protect, requireRole('ADMIN'));

router.get('/users', adminController.getUsers);
router.get('/scan-history', adminController.getScanHistory);
router.get('/logs', adminController.getAdminLogs);

export default router;
