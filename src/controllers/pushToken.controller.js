import { PushTokenService } from '../services/pushToken.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class PushTokenController {
  static async register(req, res, next) {
    try {
      const data = await PushTokenService.registerToken(req.user.id, req.body || {});
      return sendSuccess(res, data, 'Bildirim tokenı kaydedildi.', HTTP_STATUS.CREATED);
    } catch (error) {
      return next(error);
    }
  }

  static async deactivate(req, res, next) {
    try {
      const data = await PushTokenService.deactivateToken(req.user.id, req.params.id);
      return sendSuccess(res, data, 'Bildirim tokenı pasifleştirildi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }
}
