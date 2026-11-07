import { UserService } from '../services/user.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class UserController {
  static async getProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const profile = await UserService.getProfile(userId);
      return sendSuccess(res, profile, 'Kullanıcı profili getirildi');
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const updated = await UserService.updateProfile(userId, req.body);
      return sendSuccess(res, updated, 'Profil güncellendi');
    } catch (error) {
      next(error);
    }
  }
}
