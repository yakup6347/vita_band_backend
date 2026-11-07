import { AuthService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class AuthController {
  static async register(req, res, next) {
    try {
      const { email, password, name, phone, emergencyContact, bloodType } = req.body;
      if (!email || !password || !name) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'E-posta, şifre ve isim alanları zorunludur',
        });
      }

      const result = await AuthService.register({
        email,
        password,
        name,
        phone,
        emergencyContact,
        bloodType,
      });

      return sendSuccess(res, result, 'Kullanıcı kaydı başarıyla oluşturuldu', HTTP_STATUS.CREATED);
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'E-posta ve şifre zorunludur',
        });
      }

      const result = await AuthService.login({ email, password });
      return sendSuccess(res, result, 'Giriş başarılı');
    } catch (error) {
      next(error);
    }
  }
}
