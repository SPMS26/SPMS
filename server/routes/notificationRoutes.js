import express from 'express';
const router = express.Router();
import * as notificationController from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

router.use(protect);

router.get('/', notificationController.getUserNotifications);
router.put('/:id/read', notificationController.markAsRead);

export default router;
