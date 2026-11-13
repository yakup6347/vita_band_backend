import { ThresholdService } from '../services/threshold.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class ThresholdController {
  static async get(req, res, next) {
    try {
      const data = await ThresholdService.getThresholds(req.params.id);
      return sendSuccess(res, data, 'Eşik değerleri getirildi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }

  static async upsert(req, res, next) {
    try {
      const data = await ThresholdService.upsertThresholds(req.params.id, req.body || {});
      return sendSuccess(res, data, 'Eşik değerleri güncellendi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }
}
