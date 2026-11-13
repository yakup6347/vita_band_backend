import { DeviceService } from '../services/device.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class DeviceController {
  static async addDevice(req, res, next) {
    try {
      const data = await DeviceService.addDevice(req.user.id, req.body || {});
      return sendSuccess(res, data, 'Cihaz başarıyla eklendi.', HTTP_STATUS.CREATED);
    } catch (error) {
      return next(error);
    }
  }

  static async getMyDevices(req, res, next) {
    try {
      const data = await DeviceService.getUserDevices(req.user.id);
      return sendSuccess(res, data, 'Cihazlar getirildi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }

  static async heartbeat(req, res, next) {
    try {
      const data = await DeviceService.heartbeat(req.device.id, req.body || {});
      return sendSuccess(res, data, 'Cihaz durumu güncellendi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }
}
