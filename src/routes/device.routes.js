import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/pair', DeviceController.pairDevice);
router.get('/', DeviceController.getMyDevices);
router.get('/:id', DeviceController.getDeviceDetails);
router.patch('/:id', DeviceController.updateDevice);

export default router;
