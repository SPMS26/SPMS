const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(protect, requireRole('ADMIN'));

router.get('/kpis', analyticsController.getKPIs);
router.get('/monthly', analyticsController.getMonthlyHistory);
router.get('/peak-times', analyticsController.getPeakTimes);
router.get('/daily-revenue', analyticsController.getDayWiseRevenue);

module.exports = router;
