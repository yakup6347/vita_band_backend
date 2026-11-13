import pool from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/index.js';
import { toIsoUtc, toStringId } from '../utils/apiResponse.js';

export const formatAccessPermission = (row) => ({
  id: toStringId(row.id),
  owner_id: toStringId(row.owner_id),
  viewer_id: toStringId(row.viewer_id),
  status: row.status,
  created_at: toIsoUtc(row.created_at),
  updated_at: toIsoUtc(row.updated_at),
  accepted_at: toIsoUtc(row.accepted_at),
  revoked_at: toIsoUtc(row.revoked_at),
});

export class AccessService {
  static async requestAccess(ownerId, { viewer_id }) {
    if (!viewer_id || !/^\d+$/.test(String(viewer_id))) {
      throw new AppError(
        'Geçerli bir viewer_id zorunludur.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const viewerId = String(viewer_id);
    if (viewerId === String(ownerId)) {
      throw new AppError(
        'Kullanıcı kendisine erişim isteği gönderemez.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const [viewers] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND is_active = TRUE LIMIT 1',
      [viewerId]
    );
    if (viewers.length === 0) {
      throw new AppError(
        'Hedef kullanıcı (viewer_id) bulunamadı veya aktif değil.',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    const [existing] = await pool.execute(
      'SELECT * FROM access_permissions WHERE owner_id = ? AND viewer_id = ? LIMIT 1',
      [ownerId, viewerId]
    );

    if (existing.length > 0) {
      const current = existing[0];
      if (current.status === 'pending' || current.status === 'accepted') {
        throw new AppError(
          `Bu kullanıcı için zaten '${current.status}' durumunda bir erişim kaydı bulunuyor.`,
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.CONFLICT
        );
      }

      await pool.execute(
        `UPDATE access_permissions
         SET status = 'pending', accepted_at = NULL, revoked_at = NULL
         WHERE id = ?`,
        [current.id]
      );
      const [updated] = await pool.execute(
        'SELECT * FROM access_permissions WHERE id = ? LIMIT 1',
        [current.id]
      );
      return formatAccessPermission(updated[0]);
    }

    const [result] = await pool.execute(
      `INSERT INTO access_permissions (owner_id, viewer_id, status)
       VALUES (?, ?, 'pending')`,
      [ownerId, viewerId]
    );

    const [created] = await pool.execute(
      'SELECT * FROM access_permissions WHERE id = ? LIMIT 1',
      [result.insertId]
    );
    return formatAccessPermission(created[0]);
  }

  static async listMyAccess(userId) {
    const [incomingRows] = await pool.execute(
      `SELECT * FROM access_permissions
       WHERE viewer_id = ?
       ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    const [outgoingRows] = await pool.execute(
      `SELECT * FROM access_permissions
       WHERE owner_id = ?
       ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    return {
      incoming: incomingRows.map(formatAccessPermission),
      outgoing: outgoingRows.map(formatAccessPermission),
    };
  }

  static async respondToAccess(userId, accessId, { action }) {
    if (!/^\d+$/.test(String(accessId || ''))) {
      throw new AppError(
        'Geçersiz erişim izni kimliği.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    if (!['accept', 'reject'].includes(action)) {
      throw new AppError(
        "action alanı 'accept' veya 'reject' olmalıdır.",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const [rows] = await pool.execute(
      'SELECT * FROM access_permissions WHERE id = ? LIMIT 1',
      [accessId]
    );

    if (rows.length === 0) {
      throw new AppError(
        'Erişim izni kaydı bulunamadı.',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    const perm = rows[0];
    if (String(perm.viewer_id) !== String(userId)) {
      throw new AppError(
        'Yalnızca davet edilen kişi (viewer) bu isteği yanıtlayabilir.',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    if (perm.status !== 'pending') {
      throw new AppError(
        `Bu erişim isteği zaten '${perm.status}' durumunda.`,
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.CONFLICT
      );
    }

    if (action === 'accept') {
      await pool.execute(
        `UPDATE access_permissions
         SET status = 'accepted', accepted_at = UTC_TIMESTAMP(3), revoked_at = NULL
         WHERE id = ?`,
        [accessId]
      );
    } else {
      await pool.execute(
        `UPDATE access_permissions
         SET status = 'rejected'
         WHERE id = ?`,
        [accessId]
      );
    }

    const [updated] = await pool.execute(
      'SELECT * FROM access_permissions WHERE id = ? LIMIT 1',
      [accessId]
    );
    return formatAccessPermission(updated[0]);
  }

  static async revokeAccess(userId, accessId) {
    if (!/^\d+$/.test(String(accessId || ''))) {
      throw new AppError(
        'Geçersiz erişim izni kimliği.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    const [rows] = await pool.execute(
      'SELECT * FROM access_permissions WHERE id = ? LIMIT 1',
      [accessId]
    );

    if (rows.length === 0) {
      throw new AppError(
        'Erişim izni kaydı bulunamadı.',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    const perm = rows[0];
    if (
      String(perm.owner_id) !== String(userId) &&
      String(perm.viewer_id) !== String(userId)
    ) {
      throw new AppError(
        'Bu erişim iznini iptal etme yetkiniz bulunmuyor.',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    if (perm.status === 'revoked') {
      throw new AppError(
        'Bu erişim izni zaten iptal edilmiş.',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.CONFLICT
      );
    }

    await pool.execute(
      `UPDATE access_permissions
       SET status = 'revoked', revoked_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [accessId]
    );

    const [updated] = await pool.execute(
      'SELECT * FROM access_permissions WHERE id = ? LIMIT 1',
      [accessId]
    );
    return formatAccessPermission(updated[0]);
  }
}
