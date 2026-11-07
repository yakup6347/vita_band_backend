import pool from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { AppError } from '../middlewares/error.middleware.js';
import { HTTP_STATUS } from '../constants/index.js';

export class AuthService {
  // Yeni kullanıcı kaydı
  static async register({ email, password, name, phone, emergencyContact, bloodType }) {
    // 1. E-posta var mı kontrol et
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existingUsers.length > 0) {
      throw new AppError('Bu e-posta adresi ile kayıtlı bir kullanıcı zaten var', HTTP_STATUS.CONFLICT);
    }

    // 2. Şifreyi hashle
    const hashedPassword = await hashPassword(password);

    // 3. Kullanıcıyı ekle
    const [result] = await pool.execute(
      `INSERT INTO users (email, password, name, phone, emergency_contact, blood_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, hashedPassword, name, phone || null, emergencyContact || null, bloodType || null]
    );

    const userId = result.insertId;
    const token = generateToken({ userId, email });

    return {
      user: {
        id: userId,
        email,
        name,
        phone,
        emergencyContact,
        bloodType,
      },
      token,
    };
  }

  // Kullanıcı girişi
  static async login({ email, password }) {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (users.length === 0) {
      throw new AppError('E-posta veya şifre hatalı', HTTP_STATUS.UNAUTHORIZED);
    }

    const user = users[0];
    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      throw new AppError('E-posta veya şifre hatalı', HTTP_STATUS.UNAUTHORIZED);
    }

    const token = generateToken({ userId: user.id, email: user.email });

    delete user.password;
    return { user, token };
  }
}
