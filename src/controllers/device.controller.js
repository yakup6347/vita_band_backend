import { DeviceService } from '../services/device.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class DeviceController {
  // Cihazı kullanıcıyla eşleştir
  static async pairDevice(req, res, next) {
    try {
      const userId = req.user.userId;
      const device = await DeviceService.pairDevice(userId, req.body);
      return sendSuccess(res, device, 'Cihaz başarıyla eşleştirildi', HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  // Kullanıcının cihazlarını listele
  static async getMyDevices(req, res, next) {
    try {
      const userId = req.user.userId;
      const devices = await DeviceService.getUserDevices(userId);
      return sendSuccess(res, devices, 'Cihazlar listelendi');
    } catch (error) {
      next(error);
    }
  }

  // Cihaz detayı
  static async getDeviceDetails(req, res, next) {
    try {
      const userId = req.user.userId;
      const deviceId = parseInt(req.params.id, 10);
      const device = await DeviceService.getDeviceDetails(userId, deviceId);
      return sendSuccess(res, device, 'Cihaz detayları getirildi');
    } catch (error) {
      next(error);
    }
  }

  // Cihaz güncelle
  static async updateDevice(req, res, next) {
    try {
      const userId = req.user.userId;
      const deviceId = parseInt(req.params.id, 10);
      const updated = await DeviceService.updateDevice(userId, deviceId, req.body);
      return sendSuccess(res, updated, 'Cihaz bilgileri güncellendi');
    } catch (error) {
      next(error);
    }
  }
}
