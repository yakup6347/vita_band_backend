import crypto from 'crypto';
import pool from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/index.js';
import { toBool, toIsoUtc, toNum, toStringId } from '../utils/apiResponse.js';

export const formatDevice = (row, includeUserId = true) => {
  const base = {
    id: toStringId(row.id),
    ...(includeUserId ? { user_id: toStringId(row.user_id) } : {}),
    device_code: row.device_code,
    name: row.name,
    battery_level: toNum(row.battery_level),
    firmware_version: row.firmware_version ?? null,
    last_seen_at: toIsoUtc(row.last_seen_at),
    is_active: toBool(row.is_active),
    created_at: toIsoUtc(row.created_at),
    updated_at: toIsoUtc(row.updated_at),
  };
  return base;
};

export class DeviceService {
  static async addDevice(userId, { device_code, name, firmware_version }) {
    const cleanCode = typeof device_code === 'string' ? device_code.trim() : '';
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanFw =
      typeof firmware_version === 'string' && firmware_version.trim()
        ? firmware_version.trim()
        : null;

    if (!cleanCode || cleanCode.length > 64) {
      throw new AppError(
        'Geçerli bir device_code (1-64 karakter) zorunludur.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (!cleanName || cleanName.length > 100) {
      throw new AppError(
        'Geçerli bir cihaz adı (name, 1-100 karakter) zorunludur.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (cleanFw && cleanFw.length > 50) {
      throw new AppError(
        'firmware_version en fazla 50 karakter olabilir.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const [existing] = await pool.execute(
      'SELECT id FROM devices WHERE device_code = ? LIMIT 1',
      [cleanCode]
    );

    if (existing.length > 0) {
      throw new AppError(
        'Bu device_code ile kayıtlı bir cihaz zaten var.',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.CONFLICT
      );
    }

    const plainDeviceKey = crypto.randomBytes(24).toString('hex');
    const deviceKeyHash = await hashPassword(plainDeviceKey);

    const [result] = await pool.execute(
      `INSERT INTO devices (user_id, device_code, name, device_key_hash, firmware_version, is_active)
       VALUES (?, ?, ?, ?, ?, FALSE)`,
      [userId, cleanCode, cleanName, deviceKeyHash, cleanFw]
    );

    const [rows] = await pool.execute(
      `SELECT id, user_id, device_code, name, battery_level, firmware_version, last_seen_at, is_active, created_at, updated_at
       FROM devices WHERE id = ? LIMIT 1`,
      [result.insertId]
    );

    return {
      device: formatDevice(rows[0], true),
      device_key: plainDeviceKey,
    };
  }

  static async getUserDevices(userId) {
    const [rows] = await pool.execute(
      `SELECT id, user_id, device_code, name, battery_level, firmware_version, last_seen_at, is_active, created_at, updated_at
       FROM devices
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    return {
      devices: rows.map((row) => formatDevice(row, false)),
    };
  }

  static async heartbeat(deviceId, { battery_level, firmware_version }) {
    let batteryVal = null;
    if (battery_level !== undefined && battery_level !== null) {
      const parsed = Number(battery_level);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
        throw new AppError(
          'battery_level 0 ile 100 arasında bir tam sayı olmalıdır.',
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      batteryVal = parsed;
    }

    let fwVal = null;
    if (firmware_version !== undefined && firmware_version !== null) {
      const trimmed = String(firmware_version).trim();
      if (trimmed.length > 50) {
        throw new AppError(
          'firmware_version en fazla 50 karakter olabilir.',
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      fwVal = trimmed || null;
    }

    await pool.execute(
      `UPDATE devices
       SET battery_level = COALESCE(?, battery_level),
           firmware_version = COALESCE(?, firmware_version),
           is_active = TRUE,
           last_seen_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [batteryVal, fwVal, deviceId]
    );

    const [rows] = await pool.execute(
      `SELECT id, battery_level, firmware_version, is_active, last_seen_at, created_at, updated_at
       FROM devices WHERE id = ? LIMIT 1`,
      [deviceId]
    );

    const row = rows[0];
    return {
      device_id: toStringId(row.id),
      battery_level: toNum(row.battery_level),
      firmware_version: row.firmware_version ?? null,
      is_active: toBool(row.is_active),
      last_seen_at: toIsoUtc(row.last_seen_at),
      created_at: toIsoUtc(row.created_at),
      updated_at: toIsoUtc(row.updated_at),
    };
  }
}
