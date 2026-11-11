import express from 'express';
const router = express.Router();
import * as authController from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { loginIpLimiter, loginEmailLimiter, registerLimiter } from '../middleware/rateLimit.js';

router.post('/register', registerLimiter, authController.register);
router.post('/login', loginIpLimiter, loginEmailLimiter, authController.login);
router.get('/admin/config', authController.getAdminRegistrationConfig);
router.post('/admin/register', registerLimiter, authController.registerAdmin);
router.post('/admin/register/:id/pay', authController.payAdminRegistration);
router.get('/me', protect, authController.getMe);

export default router;
