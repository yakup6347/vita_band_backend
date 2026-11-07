import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AlertService } from '../services/alert.service';
import { sendSuccess } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants';

export class AlertController {
  // Manuel alarm / acil durum uyarısı oluştur (örn: mobil panik butonu)
  static async createAlert(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const alert = await AlertService.createAlert({
        userId,
        ...req.body,
      });
      sendSuccess(res, alert, 'Acil durum uyarısı oluşturuldu', HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // Kullanıcının uyarılarını listele
  static async getMyAlerts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const resolved = req.query.resolved !== undefined ? req.query.resolved === 'true' : undefined;
      const alerts = await AlertService.getUserAlerts(userId, resolved);
      sendSuccess(res, alerts, 'Uyarılar listelendi');
    } catch (error) {
      next(error);
    }
  }

  // Uyarıyı çözüldü yap
  static async resolveAlert(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const alertId = parseInt(req.params.id, 10);
      const alert = await AlertService.resolveAlert(userId, alertId);
      sendSuccess(res, alert, 'Uyarı çözüldü olarak işaretlendi');
    } catch (error) {
      next(error);
    }
  }
}
