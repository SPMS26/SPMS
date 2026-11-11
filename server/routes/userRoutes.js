import express from 'express';
const router = express.Router();
import * as userController from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { passwordLimiter } from '../middleware/rateLimit.js';

router.use(protect);

router.put('/profile', userController.updateProfile);
router.put('/password', passwordLimiter, userController.changePassword);
router.get('/vehicles', userController.getVehicles);
router.post('/vehicles', userController.addVehicle);
router.put('/vehicles/:id/default', userController.setDefaultVehicle);
router.delete('/vehicles/:id', userController.deleteVehicle);

export default router;
