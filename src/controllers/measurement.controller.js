import { MeasurementService } from '../services/measurement.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class MeasurementController {
  static async record(req, res, next) {
    try {
      const { created, measurement } = await MeasurementService.recordMeasurement(
        req.device,
        req.body || {}
      );
      return sendSuccess(
        res,
        measurement,
        'Sensör verisi kaydedildi.',
        created ? HTTP_STATUS.CREATED : HTTP_STATUS.OK
      );
    } catch (error) {
      return next(error);
    }
  }

  static async getLatest(req, res, next) {
    try {
      const data = await MeasurementService.getLatestMeasurement(req.params.id);
      return sendSuccess(res, data, 'Son ölçüm getirildi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }

  static async getHistory(req, res, next) {
    try {
      const data = await MeasurementService.getMeasurementHistory(req.params.id, req.query || {});
      return sendSuccess(res, data, 'Ölçüm geçmişi getirildi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }

  static async getSummary(req, res, next) {
    try {
      const data = await MeasurementService.getHealthSummary(req.params.id);
      return sendSuccess(res, data, 'Sağlık özeti getirildi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }
}
