import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { TelemetryService } from '../services/telemetry.service';
import { sendSuccess } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants';

export class TelemetryController {
  // Tekil telemetri ölçümü kaydet (Mobil BLE üzerinden gelen anlık veri)
  static async record(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await TelemetryService.recordTelemetry(userId, req.body);
      sendSuccess(res, result, 'Telemetri verisi başarıyla kaydedildi', HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // Toplu telemetri kaydet (Offline modda biriken verilerin senkronizasyonu)
  static async recordBatch(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { macAddress, readings } = req.body;
      const result = await TelemetryService.recordBatchTelemetry(userId, macAddress, readings);
      sendSuccess(res, result, 'Toplu telemetri verileri kaydedildi', HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // Cihazın geçmiş telemetri verilerini sorgula
  static async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const deviceId = parseInt(req.params.deviceId, 10);
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const history = await TelemetryService.getDeviceTelemetryHistory(userId, deviceId, {
        limit,
        startDate,
        endDate,
      });

      sendSuccess(res, history, 'Telemetri geçmişi başarıyla getirildi');
    } catch (error) {
      next(error);
    }
  }
}
