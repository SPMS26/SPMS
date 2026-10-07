import express from 'express';
const router = express.Router();
import * as authController from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/admin/config', authController.getAdminRegistrationConfig);
router.post('/admin/register', authController.registerAdmin);
router.post('/admin/register/:id/pay', authController.payAdminRegistration);
router.get('/me', protect, authController.getMe);

export default router;
