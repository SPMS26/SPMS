const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { protect } = require('../middleware/auth');

router.post('/validate-entry', protect, qrController.validateEntry);
router.post('/validate-exit', protect, qrController.validateExit);
router.post('/confirm-exit-payment', protect, qrController.confirmExitPayment);
router.post('/auto-validate', protect, qrController.autoValidate);
router.post('/verify-scan', protect, qrController.autoValidate);
router.get('/booking/:bookingId', protect, qrController.getLiveQR);
router.get('/gate-queue', protect, qrController.getGateQueue);

module.exports = router;
