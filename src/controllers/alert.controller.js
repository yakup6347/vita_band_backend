import { AlertService } from '../services/alert.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class AlertController {
  // Manuel alarm oluştur (Örn: Mobil uygulamadan panik butonu)
  static async createAlert(req, res, next) {
    try {
      const userId = req.user.userId;
      const { deviceId, type, severity, message } = req.body;
      const alert = await AlertService.createAlert({
        userId,
        deviceId,
        type,
        severity,
        message,
      });
      return sendSuccess(res, alert, 'Acil durum uyarısı oluşturuldu', HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // Kullanıcının uyarılarını listele
  static async getMyAlerts(req, res, next) {
    try {
      const userId = req.user.userId;
      const resolved = req.query.resolved !== undefined ? req.query.resolved === 'true' : undefined;
      const alerts = await AlertService.getUserAlerts(userId, resolved);
      return sendSuccess(res, alerts, 'Uyarılar listelendi');
    } catch (error) {
      next(error);
    }
  }

  // Uyarıyı çözüldü yap
  static async resolveAlert(req, res, next) {
    try {
      const userId = req.user.userId;
      const alertId = parseInt(req.params.id, 10);
      const alert = await AlertService.resolveAlert(userId, alertId);
      return sendSuccess(res, alert, 'Uyarı çözüldü olarak işaretlendi');
    } catch (error) {
      next(error);
    }
  }
}
