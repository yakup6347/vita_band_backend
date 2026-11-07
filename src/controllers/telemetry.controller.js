import { TelemetryService } from '../services/telemetry.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class TelemetryController {
  // Anlık telemetri kaydı (BLE üzerinden mobilin gönderdiği veri)
  static async record(req, res, next) {
    try {
      const userId = req.user.userId;
      const result = await TelemetryService.recordTelemetry(userId, req.body);
      return sendSuccess(res, result, 'Telemetri verisi başarıyla kaydedildi', HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // Toplu telemetri kaydı (Offline mod sonrası senkronizasyon)
  static async recordBatch(req, res, next) {
    try {
      const userId = req.user.userId;
      const { macAddress, readings } = req.body;
      const result = await TelemetryService.recordBatchTelemetry(userId, macAddress, readings);
      return sendSuccess(res, result, 'Toplu telemetri verileri kaydedildi', HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // Cihazın geçmiş telemetri ölçümleri
  static async getHistory(req, res, next) {
    try {
      const userId = req.user.userId;
      const deviceId = parseInt(req.params.deviceId, 10);
      const { limit, startDate, endDate } = req.query;

      const history = await TelemetryService.getHistory(userId, deviceId, {
        limit,
        startDate,
        endDate,
      });

      return sendSuccess(res, history, 'Telemetri geçmişi başarıyla getirildi');
    } catch (error) {
      next(error);
    }
  }
}
