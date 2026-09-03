const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(protect, requireRole('ADMIN'));

router.get('/users', adminController.getUsers);
router.get('/scan-history', adminController.getScanHistory);
router.get('/logs', adminController.getAdminLogs);

module.exports = router;
