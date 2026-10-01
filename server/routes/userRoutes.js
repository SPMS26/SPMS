import express from 'express';
const router = express.Router();
import * as userController from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

router.use(protect);

router.put('/profile', userController.updateProfile);
router.get('/vehicles', userController.getVehicles);
router.post('/vehicles', userController.addVehicle);
router.delete('/vehicles/:id', userController.deleteVehicle);

export default router;
