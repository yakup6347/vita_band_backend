import crypto from 'crypto';
import pool from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/index.js';
import { toBool, toIsoUtc, toStringId } from '../utils/apiResponse.js';

export const formatPushToken = (row) => ({
  id: toStringId(row.id),
  user_id: toStringId(row.user_id),
  provider: row.provider,
  platform: row.platform,
  installation_id: row.installation_id,
  is_active: toBool(row.is_active),
  created_at: toIsoUtc(row.created_at),
  updated_at: toIsoUtc(row.updated_at),
  last_registered_at: toIsoUtc(row.last_registered_at),
  last_used_at: toIsoUtc(row.last_used_at),
  revoked_at: toIsoUtc(row.revoked_at),
});

export class PushTokenService {
  static async registerToken(userId, body) {
    const provider = typeof body.provider === 'string' ? body.provider.trim().toLowerCase() : '';
    const platform = typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : '';
    const installationId =
      typeof body.installation_id === 'string' ? body.installation_id.trim() : '';
    const token = typeof body.token === 'string' ? body.token.trim() : '';

    if (!provider || provider.length > 32) {
      throw new AppError(
        'Geçerli bir provider (1-32 karakter) zorunludur.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (!['android', 'ios'].includes(platform)) {
      throw new AppError(
        "platform alanı 'android' veya 'ios' olmalıdır.",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (!installationId || installationId.length > 64) {
      throw new AppError(
        'Geçerli bir installation_id (1-64 karakter) zorunludur.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (!token) {
      throw new AppError(
        'token alanı boş olamaz.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Aynı provider + token_hash başka kurulumda kayıtlıysa eski kurulumu temizle
      await connection.execute(
        `DELETE FROM push_tokens
         WHERE provider = ? AND token_hash = ? AND installation_id <> ?`,
        [provider, tokenHash, installationId]
      );

      const [existing] = await connection.execute(
        `SELECT id FROM push_tokens WHERE provider = ? AND installation_id = ? LIMIT 1`,
        [provider, installationId]
      );

      let tokenId;
      if (existing.length > 0) {
        tokenId = existing[0].id;
        await connection.execute(
          `UPDATE push_tokens
           SET user_id = ?, platform = ?, token = ?, token_hash = ?,
               is_active = TRUE, revoked_at = NULL, last_registered_at = UTC_TIMESTAMP(3)
           WHERE id = ?`,
          [userId, platform, token, tokenHash, tokenId]
        );
      } else {
        const [insertRes] = await connection.execute(
          `INSERT INTO push_tokens (
             user_id, provider, platform, installation_id, token, token_hash, is_active, last_registered_at
           ) VALUES (?, ?, ?, ?, ?, ?, TRUE, UTC_TIMESTAMP(3))`,
          [userId, provider, platform, installationId, token, tokenHash]
        );
        tokenId = insertRes.insertId;
      }

      const [saved] = await connection.execute(
        'SELECT * FROM push_tokens WHERE id = ? LIMIT 1',
        [tokenId]
      );

      await connection.commit();
      return formatPushToken(saved[0]);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  static async deactivateToken(userId, tokenId) {
    if (!/^\d+$/.test(String(tokenId || ''))) {
      throw new AppError(
        'Geçersiz push token kimliği.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    const [rows] = await pool.execute(
      'SELECT * FROM push_tokens WHERE id = ? LIMIT 1',
      [tokenId]
    );

    if (rows.length === 0) {
      throw new AppError(
        'Bildirim tokenı bulunamadı.',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    if (String(rows[0].user_id) !== String(userId)) {
      throw new AppError(
        'Bu bildirim tokenını pasifleştirme yetkiniz bulunmuyor.',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    await pool.execute(
      `UPDATE push_tokens
       SET is_active = FALSE, revoked_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [tokenId]
    );

    const [updated] = await pool.execute(
      `SELECT id, is_active, created_at, updated_at, last_registered_at, last_used_at, revoked_at
       FROM push_tokens WHERE id = ? LIMIT 1`,
      [tokenId]
    );

    const row = updated[0];
    return {
      id: toStringId(row.id),
      is_active: toBool(row.is_active),
      created_at: toIsoUtc(row.created_at),
      updated_at: toIsoUtc(row.updated_at),
      last_registered_at: toIsoUtc(row.last_registered_at),
      last_used_at: toIsoUtc(row.last_used_at),
      revoked_at: toIsoUtc(row.revoked_at),
    };
  }
}
