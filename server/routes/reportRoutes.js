const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const upload = require('../middleware/upload');

router.use(protect);

router.post('/', upload.single('image'), reportController.createReport);
router.get('/', reportController.getReports);
router.put('/:id/status', requireRole('ADMIN'), reportController.updateReportStatus);

module.exports = router;
