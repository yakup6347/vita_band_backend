import pool from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/index.js';
import { formatUser } from './auth.service.js';

export class UserService {
  static async getMe(userId) {
    const [users] = await pool.execute(
      'SELECT id, full_name, email, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (users.length === 0) {
      throw new AppError(
        'Kullanıcı bulunamadı.',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    return formatUser(users[0]);
  }
}
