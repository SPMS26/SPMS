const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.put('/profile', userController.updateProfile);
router.get('/vehicles', userController.getVehicles);
router.post('/vehicles', userController.addVehicle);
router.delete('/vehicles/:id', userController.deleteVehicle);

module.exports = router;
