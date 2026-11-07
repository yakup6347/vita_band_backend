import { Router } from 'express';
import { TelemetryController } from '../controllers/telemetry.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// BLE sensör anlık ölçüm verisi kaydetme
router.post('/', TelemetryController.record);

// Toplu ölçüm verisi senkronizasyonu
router.post('/batch', TelemetryController.recordBatch);

// Cihazın geçmiş ölçüm kayıtları
router.get('/:deviceId/history', TelemetryController.getHistory);

export default router;
