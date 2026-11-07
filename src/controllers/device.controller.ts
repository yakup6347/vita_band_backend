import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { DeviceService } from '../services/device.service';
import { sendSuccess } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants';

export class DeviceController {
  // Cihaz ekle veya eşleştir
  static async pairDevice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const device = await DeviceService.registerOrPairDevice(userId, req.body);
      sendSuccess(res, device, 'Cihaz başarıyla eşleştirildi', HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // Kullanıcının cihazlarını listele
  static async getMyDevices(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const devices = await DeviceService.getUserDevices(userId);
      sendSuccess(res, devices, 'Cihazlar listelendi');
    } catch (error) {
      next(error);
    }
  }

  // Cihaz detayları ve son ölçüm
  static async getDeviceDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const deviceId = parseInt(req.params.id, 10);
      const device = await DeviceService.getDeviceDetails(userId, deviceId);
      sendSuccess(res, device, 'Cihaz detayları getirildi');
    } catch (error) {
      next(error);
    }
  }

  // Cihaz güncelle
  static async updateDevice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const deviceId = parseInt(req.params.id, 10);
      const updated = await DeviceService.updateDevice(userId, deviceId, req.body);
      sendSuccess(res, updated, 'Cihaz güncellendi');
    } catch (error) {
      next(error);
    }
  }
}
