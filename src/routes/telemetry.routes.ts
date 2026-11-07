import { Router } from 'express';
import { TelemetryController } from '../controllers/telemetry.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createTelemetrySchema, batchTelemetrySchema } from '../validators/telemetry.validator';

const router = Router();

// Mobil uygulama kimlik doğrulaması ile bağlanır
router.use(authenticate);

// BLE üzerinden telefona gelen tekil anlık ölçümü kaydetme
router.post('/', validate(createTelemetrySchema), TelemetryController.record);

// Toplu ölçüm verisi yükleme
router.post('/batch', validate(batchTelemetrySchema), TelemetryController.recordBatch);

// Belirli bir cihazın geçmiş ölçüm verilerini getirme (grafik ve istatistik için)
router.get('/:deviceId/history', TelemetryController.getHistory);

export default router;
