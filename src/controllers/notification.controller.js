import { NotificationService } from '../services/notification.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class NotificationController {
  static async listMyNotifications(req, res, next) {
    try {
      const data = await NotificationService.listMyNotifications(req.user.id, req.query || {});
      return sendSuccess(res, data, 'Bildirimler getirildi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const data = await NotificationService.markAsRead(req.user.id, req.params.id);
      return sendSuccess(res, data, 'Bildirim okundu olarak işaretlendi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }
}
