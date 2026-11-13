import { AuthService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class AuthController {
  static async register(req, res, next) {
    try {
      const data = await AuthService.register(req.body || {});
      return sendSuccess(res, data, 'Kullanıcı başarıyla oluşturuldu.', HTTP_STATUS.CREATED);
    } catch (error) {
      return next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const data = await AuthService.login(req.body || {});
      return sendSuccess(res, data, 'Giriş başarılı.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }
}
