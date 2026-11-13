import { UserService } from '../services/user.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class UserController {
  static async getMe(req, res, next) {
    try {
      const user = await UserService.getMe(req.user.id);
      return sendSuccess(res, user, 'Kullanıcı bilgileri getirildi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }
}
