import { EventService } from '../services/event.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class EventController {
  static async listUserEvents(req, res, next) {
    try {
      const data = await EventService.listUserEvents(req.params.id, req.query || {});
      return sendSuccess(res, data, 'Acil durum kayıtları getirildi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }

  static async updateEvent(req, res, next) {
    try {
      const data = await EventService.updateEventStatus(
        req.user.id,
        req.params.id,
        req.body || {}
      );
      const message =
        req.body?.action === 'resolve'
          ? 'Acil durum olayı çözüldü.'
          : 'Acil durum geri sayımı iptal edildi.';
      return sendSuccess(res, data, message, HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }
}
