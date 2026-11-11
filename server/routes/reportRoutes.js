import express from 'express';
const router = express.Router();
import * as reportController from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import upload from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimit.js';

router.use(protect);

router.post('/', uploadLimiter, upload.single('image'), reportController.createReport);
router.get('/', reportController.getReports);
router.put('/:id/status', requireRole('ADMIN'), reportController.updateReportStatus);

export default router;
