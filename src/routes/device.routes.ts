import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { registerDeviceSchema, updateDeviceSchema } from '../validators/device.validator';

const router = Router();

// Tüm rotalar kimlik doğrulaması gerektirir
router.use(authenticate);

router.post('/pair', validate(registerDeviceSchema), DeviceController.pairDevice);
router.get('/', DeviceController.getMyDevices);
router.get('/:id', DeviceController.getDeviceDetails);
router.patch('/:id', validate(updateDeviceSchema), DeviceController.updateDevice);

export default router;
