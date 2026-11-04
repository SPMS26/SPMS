import express from 'express';
const router = express.Router();
import * as adminController from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

router.use(protect);

// Owner-only
router.get('/users', requireRole('ADMIN'), adminController.getUsers);
router.get('/logs', requireRole('ADMIN'), adminController.getAdminLogs);
router.get('/security', requireRole('ADMIN'), adminController.getSecurityStaff);
router.post('/security', requireRole('ADMIN'), adminController.createSecurityStaff);
router.put('/security/:id', requireRole('ADMIN'), adminController.updateSecurityStaff);
router.delete('/security/:id', requireRole('ADMIN'), adminController.deleteSecurityStaff);

// Owner and gate staff (scoped to their lot(s) inside the controller)
router.get('/scan-history', requireRole('ADMIN', 'SECURITY'), adminController.getScanHistory);

export default router;
