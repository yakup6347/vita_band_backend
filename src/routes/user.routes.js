import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { DeviceController } from '../controllers/device.controller.js';
import { MeasurementController } from '../controllers/measurement.controller.js';
import { ThresholdController } from '../controllers/threshold.controller.js';
import { EventController } from '../controllers/event.controller.js';
import { ContactController } from '../controllers/contact.controller.js';
import { AccessController } from '../controllers/access.controller.js';
import { NotificationController } from '../controllers/notification.controller.js';
import {
  authenticateUser,
  authorizeOwnerOnly,
  authorizeOwnerOrViewer,
} from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateUser);

// /users/me rotaları (statik yollar :id öncesinde olmalı)
router.get('/me', UserController.getMe);
router.get('/me/devices', DeviceController.getMyDevices);
router.get('/me/notifications', NotificationController.listMyNotifications);

// /users/:id ölçüm ve sağlık özeti (owner veya accepted viewer)
router.get('/:id/measurements/latest', authorizeOwnerOrViewer('id'), MeasurementController.getLatest);
router.get('/:id/measurements', authorizeOwnerOrViewer('id'), MeasurementController.getHistory);
router.get('/:id/summary', authorizeOwnerOrViewer('id'), MeasurementController.getSummary);

// /users/:id eşik değerleri
router.get('/:id/thresholds', authorizeOwnerOrViewer('id'), ThresholdController.get);
router.put('/:id/thresholds', authorizeOwnerOnly('id'), ThresholdController.upsert);

// /users/:id acil durum olayları
router.get('/:id/events', authorizeOwnerOrViewer('id'), EventController.listUserEvents);

// /users/:id acil durum kişileri
router.get('/:id/contacts', authorizeOwnerOnly('id'), ContactController.list);
router.post('/:id/contacts', authorizeOwnerOnly('id'), ContactController.add);
router.delete('/:id/contacts/:contactId', authorizeOwnerOnly('id'), ContactController.deactivate);

// /users/:id erişim isteği gönderme
router.post('/:id/access', authorizeOwnerOnly('id'), AccessController.requestAccess);

export default router;
