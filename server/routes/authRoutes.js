import express from 'express';
const router = express.Router();
import * as authController from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);

export default router;
