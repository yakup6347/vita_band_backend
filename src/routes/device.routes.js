import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller.js';
import { MeasurementController } from '../controllers/measurement.controller.js';
import { authenticateDevice, authenticateUser } from '../middlewares/auth.middleware.js';

export const devicesRouter = Router();
devicesRouter.post('/', authenticateUser, DeviceController.addDevice);

export const deviceAgentRouter = Router();
deviceAgentRouter.post('/heartbeat', authenticateDevice, DeviceController.heartbeat);
deviceAgentRouter.post('/measurements', authenticateDevice, MeasurementController.record);
