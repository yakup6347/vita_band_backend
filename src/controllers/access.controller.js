import { AccessService } from '../services/access.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class AccessController {
  static async requestAccess(req, res, next) {
    try {
      const data = await AccessService.requestAccess(req.params.id, req.body || {});
      return sendSuccess(res, data, 'Erişim isteği gönderildi.', HTTP_STATUS.CREATED);
    } catch (error) {
      return next(error);
    }
  }

  static async listMyAccess(req, res, next) {
    try {
      const data = await AccessService.listMyAccess(req.user.id);
      return sendSuccess(res, data, 'Erişim izinleri getirildi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }

  static async respondToAccess(req, res, next) {
    try {
      const data = await AccessService.respondToAccess(
        req.user.id,
        req.params.id,
        req.body || {}
      );
      return sendSuccess(res, data, 'Erişim isteği güncellendi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }

  static async revokeAccess(req, res, next) {
    try {
      const data = await AccessService.revokeAccess(req.user.id, req.params.id);
      return sendSuccess(res, data, 'Erişim izni iptal edildi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }
}
