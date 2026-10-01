import express from 'express';
const router = express.Router();
import * as analyticsController from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

router.use(protect, requireRole('ADMIN'));

router.get('/kpis', analyticsController.getKPIs);
router.get('/monthly', analyticsController.getMonthlyHistory);
router.get('/peak-times', analyticsController.getPeakTimes);
router.get('/daily-revenue', analyticsController.getDayWiseRevenue);

export default router;
