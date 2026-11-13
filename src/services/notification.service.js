import pool from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/index.js';
import { parsePagination, toIsoUtc, toStringId } from '../utils/apiResponse.js';

export const formatNotification = (row) => ({
  id: toStringId(row.id),
  event_id: toStringId(row.event_id),
  recipient_user_id: toStringId(row.recipient_user_id),
  recipient_contact_id: toStringId(row.recipient_contact_id),
  title: row.title,
  message: row.message,
  type: row.type,
  channel: row.channel,
  status: row.status,
  sent_at: toIsoUtc(row.sent_at),
  read_at: toIsoUtc(row.read_at),
  provider_message_id: row.provider_message_id ?? null,
});

export class NotificationService {
  static async listMyNotifications(userId, query) {
    const { page, limit, offset } = parsePagination(query);

    const [countRows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM notifications WHERE recipient_user_id = ?',
      [userId]
    );
    const total = Number(countRows[0].total);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const [rows] = await pool.query(
      `SELECT id, event_id, recipient_user_id, recipient_contact_id, title, message,
              type, channel, status, sent_at, read_at, provider_message_id
       FROM notifications
       WHERE recipient_user_id = ?
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return {
      notifications: rows.map(formatNotification),
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };
  }

  static async markAsRead(userId, notificationId) {
    if (!/^\d+$/.test(String(notificationId || ''))) {
      throw new AppError(
        'Geçersiz bildirim kimliği.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    const [rows] = await pool.execute(
      'SELECT id, recipient_user_id, read_at FROM notifications WHERE id = ? LIMIT 1',
      [notificationId]
    );

    if (rows.length === 0) {
      throw new AppError(
        'Bildirim bulunamadı.',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    if (String(rows[0].recipient_user_id) !== String(userId)) {
      throw new AppError(
        'Bu bildirimi okundu olarak işaretleme yetkiniz bulunmuyor.',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    await pool.execute(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, UTC_TIMESTAMP(3))
       WHERE id = ?`,
      [notificationId]
    );

    const [updated] = await pool.execute(
      'SELECT id, read_at FROM notifications WHERE id = ? LIMIT 1',
      [notificationId]
    );

    return {
      id: toStringId(updated[0].id),
      read_at: toIsoUtc(updated[0].read_at),
    };
  }
}
