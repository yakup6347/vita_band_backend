import pool from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/index.js';
import { env } from '../config/env.js';
import { parsePagination, toIsoUtc, toNum, toStringId } from '../utils/apiResponse.js';

export const formatEvent = (row) => ({
  id: toStringId(row.id),
  user_id: toStringId(row.user_id),
  device_id: toStringId(row.device_id),
  measurement_id: toStringId(row.measurement_id),
  event_key: row.event_key,
  event_type: row.event_type,
  status: row.status,
  detected_at: toIsoUtc(row.detected_at),
  countdown_seconds: toNum(row.countdown_seconds),
  deadline_at: toIsoUtc(row.deadline_at),
  resolved_at: toIsoUtc(row.resolved_at),
  resolution_reason: row.resolution_reason ?? null,
  created_at: toIsoUtc(row.created_at),
  updated_at: toIsoUtc(row.updated_at),
});

const EVENT_MESSAGES = {
  fall: 'Olası düşme algılandı.',
  high_heart_rate: 'Kritik yüksek nabız algılandı.',
  low_heart_rate: 'Kritik düşük nabız algılandı.',
  low_spo2: 'Düşük kan oksijen (SpO2) seviyesi algılandı.',
  high_stress: 'Yüksek stres seviyesi algılandı.',
};

export class EventService {
  static async createPendingEvent(
    connection,
    { userId, deviceId, measurementId, eventKey, eventType, detectedAt, countdownSeconds }
  ) {
    const cdSeconds = countdownSeconds || env.EVENT_COUNTDOWN_SECONDS;
    const now = new Date();
    const deadline = new Date(now.getTime() + cdSeconds * 1000);
    const detected = detectedAt ? new Date(detectedAt) : now;

    // Aynı (device_id, event_key) varsa mevcut olayı döndür
    const [existing] = await connection.execute(
      'SELECT * FROM events WHERE device_id = ? AND event_key = ? LIMIT 1',
      [deviceId, eventKey]
    );
    if (existing.length > 0) {
      return existing[0];
    }

    const [result] = await connection.execute(
      `INSERT INTO events (
         user_id, device_id, measurement_id, event_key, event_type,
         status, detected_at, countdown_seconds, deadline_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      [userId, deviceId, measurementId, eventKey, eventType, detected, cdSeconds, deadline, now, now]
    );

    const eventId = result.insertId;

    // Kullanıcıya geri sayım bildirimi kuyruğa ekle
    const alertText = EVENT_MESSAGES[eventType] || 'Acil durum algılandı.';
    await connection.execute(
      `INSERT INTO notifications (
         event_id, recipient_user_id, recipient_contact_id, title, message, type, channel, status
       ) VALUES (?, ?, NULL, ?, ?, 'countdown', 'push', 'queued')`,
      [
        eventId,
        userId,
        'Acil Durum Geri Sayımı',
        `${alertText} ${cdSeconds} saniye içinde iptal edilmezse acil durum kişilerinize haber verilecek.`,
      ]
    );

    const [created] = await connection.execute('SELECT * FROM events WHERE id = ? LIMIT 1', [
      eventId,
    ]);
    return created[0];
  }

  static async listUserEvents(userId, query) {
    const { page, limit, offset } = parsePagination(query);

    const [countRows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM events WHERE user_id = ?',
      [userId]
    );
    const total = Number(countRows[0].total);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const [rows] = await pool.query(
      `SELECT id, user_id, device_id, measurement_id, event_key, event_type, status,
              detected_at, countdown_seconds, deadline_at, resolved_at, resolution_reason,
              created_at, updated_at
       FROM events
       WHERE user_id = ?
       ORDER BY detected_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return {
      events: rows.map(formatEvent),
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };
  }

  static async updateEventStatus(userId, eventId, { action, resolution_reason }) {
    if (!/^\d+$/.test(String(eventId || ''))) {
      throw new AppError(
        'Geçersiz olay kimliği.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    if (!['cancel', 'resolve'].includes(action)) {
      throw new AppError(
        "action alanı 'cancel' veya 'resolve' olmalıdır.",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const reason =
      typeof resolution_reason === 'string' && resolution_reason.trim()
        ? resolution_reason.trim().slice(0, 255)
        : null;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute(
        'SELECT * FROM events WHERE id = ? FOR UPDATE',
        [eventId]
      );

      if (rows.length === 0) {
        throw new AppError(
          'Acil durum olayı bulunamadı.',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.NOT_FOUND
        );
      }

      const event = rows[0];
      if (String(event.user_id) !== String(userId)) {
        throw new AppError(
          'Bu olayı güncelleme yetkiniz bulunmuyor.',
          HTTP_STATUS.FORBIDDEN,
          ERROR_CODES.FORBIDDEN
        );
      }

      if (action === 'cancel') {
        if (event.status !== 'pending') {
          throw new AppError(
            `Yalnızca 'pending' durumundaki olaylar iptal edilebilir (mevcut durum: ${event.status}).`,
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.CONFLICT
          );
        }

        const now = new Date();
        await connection.execute(
          `UPDATE events
           SET status = 'cancelled', resolved_at = ?, resolution_reason = ?
           WHERE id = ?`,
          [now, reason, eventId]
        );

        await connection.execute(
          `UPDATE notifications
           SET status = 'cancelled'
           WHERE event_id = ? AND status = 'queued'`,
          [eventId]
        );
      } else {
        if (!['pending', 'escalated'].includes(event.status)) {
          throw new AppError(
            `Bu olay zaten sonuçlandırılmış (mevcut durum: ${event.status}).`,
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.CONFLICT
          );
        }

        const now = new Date();
        await connection.execute(
          `UPDATE events
           SET status = 'resolved', resolved_at = ?, resolution_reason = ?
           WHERE id = ?`,
          [now, reason, eventId]
        );
      }

      const [updated] = await connection.execute(
        `SELECT id, status, resolved_at, resolution_reason, created_at, updated_at
         FROM events WHERE id = ? LIMIT 1`,
        [eventId]
      );

      await connection.commit();

      const row = updated[0];
      return {
        id: toStringId(row.id),
        status: row.status,
        resolved_at: toIsoUtc(row.resolved_at),
        resolution_reason: row.resolution_reason ?? null,
        created_at: toIsoUtc(row.created_at),
        updated_at: toIsoUtc(row.updated_at),
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}
