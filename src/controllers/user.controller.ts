import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { UserService } from '../services/user.service';
import { sendSuccess } from '../utils/apiResponse';

export class UserController {
  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const profile = await UserService.getProfile(userId);
      sendSuccess(res, profile, 'Kullanıcı profili getirildi');
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const updated = await UserService.updateProfile(userId, req.body);
      sendSuccess(res, updated, 'Profil güncellendi');
    } catch (error) {
      next(error);
    }
  }
}
