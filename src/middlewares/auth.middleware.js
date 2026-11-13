import pool from '../config/db.js';
import { verifyToken } from '../utils/jwt.js';
import { comparePassword } from '../utils/password.js';
import { sendError, toStringId } from '../utils/apiResponse.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/index.js';

// Bearer JWT ile kullanıcı doğrulama
export const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(
      res,
      'Yetkilendirme belirteci (token) eksik veya geçersiz format.',
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED
    );
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return sendError(
      res,
      'Yetkilendirme belirteci boş olamaz.',
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED
    );
  }

  try {
    const decoded = verifyToken(token);
    const userId = decoded.userId || decoded.sub;

    const [users] = await pool.execute(
      'SELECT id, full_name, email, is_active FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (users.length === 0 || Number(users[0].is_active) !== 1) {
      return sendError(
        res,
        'Kullanıcı hesabı bulunamadı veya aktif değil.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const user = users[0];
    req.user = {
      id: toStringId(user.id),
      userId: toStringId(user.id),
      email: user.email,
      full_name: user.full_name,
    };
    return next();
  } catch {
    return sendError(
      res,
      'Oturum süresi dolmuş veya geçersiz token.',
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED
    );
  }
};

// X-Device-Code + X-Device-Key ile cihaz doğrulama
export const authenticateDevice = async (req, res, next) => {
  try {
    const deviceCode = String(
      req.headers['x-device-code'] || req.body?.device_code || ''
    ).trim();
    const deviceKey = String(req.headers['x-device-key'] || '').trim();

    if (!deviceCode || !deviceKey) {
      return sendError(
        res,
        'Cihaz kimlik doğrulama başlıkları (X-Device-Code, X-Device-Key) zorunludur.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const [devices] = await pool.execute(
      `SELECT d.id, d.user_id, d.device_code, d.name, d.device_key_hash, d.battery_level,
              d.firmware_version, d.last_seen_at, d.is_active, d.created_at, d.updated_at,
              u.is_active AS owner_is_active
       FROM devices d
       JOIN users u ON d.user_id = u.id
       WHERE d.device_code = ?
       LIMIT 1`,
      [deviceCode]
    );

    if (devices.length === 0) {
      return sendError(
        res,
        'Cihaz kodu sistemde bulunamadı.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const device = devices[0];
    if (!device.device_key_hash) {
      return sendError(
        res,
        'Cihaz için güvenlik anahtarı tanımlı değil.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const validKey = await comparePassword(deviceKey, device.device_key_hash);
    if (!validKey) {
      return sendError(
        res,
        'Cihaz kimlik doğrulaması başarısız.',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    if (Number(device.owner_is_active) !== 1) {
      return sendError(
        res,
        'Cihaz sahibinin hesabı aktif değil.',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    req.device = {
      id: toStringId(device.id),
      user_id: toStringId(device.user_id),
      device_code: device.device_code,
      name: device.name,
    };

    return next();
  } catch (err) {
    return next(err);
  }
};

// Sadece hedef kullanıcı (:id) kendi kaydına erişebilir
export const authorizeOwnerOnly = (paramName = 'id') => {
  return (req, res, next) => {
    const rawTarget = req.params[paramName];
    if (!/^\d+$/.test(String(rawTarget || ''))) {
      return sendError(
        res,
        'Geçersiz kullanıcı kimliği.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    if (String(rawTarget) !== req.user.id) {
      return sendError(
        res,
        'Bu işlem için erişim izniniz bulunmuyor.',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    return next();
  };
};

// Hedef kullanıcının kendisi VEYA kabul edilmiş & iptal edilmemiş erişim izni olan aktif yakını erişebilir
export const authorizeOwnerOrViewer = (paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const rawTarget = req.params[paramName];
      if (!/^\d+$/.test(String(rawTarget || ''))) {
        return sendError(
          res,
          'Geçersiz kullanıcı kimliği.',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST
        );
      }

      const targetUserId = String(rawTarget);
      if (targetUserId === req.user.id) {
        return next();
      }

      // Hedef kullanıcı aktif mi ve erişim izni var mı?
      const [rows] = await pool.execute(
        `SELECT p.id
         FROM access_permissions p
         JOIN users owner_u ON p.owner_id = owner_u.id
         WHERE p.owner_id = ?
           AND p.viewer_id = ?
           AND p.status = 'accepted'
           AND p.revoked_at IS NULL
           AND owner_u.is_active = TRUE
         LIMIT 1`,
        [targetUserId, req.user.id]
      );

      if (rows.length === 0) {
        return sendError(
          res,
          'Bu veriye erişim izniniz bulunmuyor.',
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN
        );
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
};
