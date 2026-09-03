const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', notificationController.getUserNotifications);
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
