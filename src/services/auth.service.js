import pool from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/index.js';
import { env } from '../config/env.js';
import { toBool, toIsoUtc, toStringId } from '../utils/apiResponse.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const formatUser = (row) => ({
  id: toStringId(row.id),
  full_name: row.full_name,
  email: row.email,
  is_active: toBool(row.is_active),
  created_at: toIsoUtc(row.created_at),
  updated_at: toIsoUtc(row.updated_at),
});

export class AuthService {
  static async register({ full_name, email, password }) {
    const cleanName = typeof full_name === 'string' ? full_name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (!cleanName || cleanName.length > 150) {
      throw new AppError(
        'Ad soyad (full_name) zorunludur ve en fazla 150 karakter olabilir.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (!cleanEmail || cleanEmail.length > 254 || !EMAIL_REGEX.test(cleanEmail)) {
      throw new AppError(
        'Geçerli bir e-posta adresi giriniz.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (rawPassword.length < 6) {
      throw new AppError(
        'Şifre en az 6 karakter olmalıdır.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      throw new AppError(
        'Bu e-posta adresi ile kayıtlı bir kullanıcı zaten var.',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.CONFLICT
      );
    }

    const passwordHash = await hashPassword(rawPassword);

    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, password_hash, is_active)
       VALUES (?, ?, ?, TRUE)`,
      [cleanName, cleanEmail, passwordHash]
    );

    const [createdRows] = await pool.execute(
      'SELECT id, full_name, email, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return {
      user: formatUser(createdRows[0]),
    };
  }

  static async login({ email, password }) {
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (!cleanEmail || !rawPassword) {
      throw new AppError(
        'E-posta ve şifre zorunludur.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    const [users] = await pool.execute(
      'SELECT id, full_name, email, password_hash, is_active, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (users.length === 0) {
      throw new AppError(
        'E-posta veya şifre hatalı.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const user = users[0];
    if (Number(user.is_active) !== 1) {
      throw new AppError(
        'Kullanıcı hesabı aktif değil.',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    if (!user.password_hash || user.password_hash === '!') {
      throw new AppError(
        'E-posta veya şifre hatalı.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const isMatch = await comparePassword(rawPassword, user.password_hash);
    if (!isMatch) {
      throw new AppError(
        'E-posta veya şifre hatalı.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const accessToken = generateToken({
      userId: toStringId(user.id),
      email: user.email,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: env.JWT_EXPIRES_IN,
      user: formatUser(user),
    };
  }
}
