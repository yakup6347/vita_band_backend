import pool from '../config/db.js';
import { env } from '../config/env.js';

const EVENT_TITLES = {
  fall: 'Acil Durum: Düşme Algılandı',
  high_heart_rate: 'Acil Durum: Yüksek Nabız',
  low_heart_rate: 'Acil Durum: Düşük Nabız',
  low_spo2: 'Acil Durum: Düşük Oksijen (SpO2)',
  high_stress: 'Acil Durum: Yüksek Stres',
};

// Süresi dolmuş pending olayları escalated durumuna geçirir ve acil durum kişilerine bildirim kuyruğuna ekler
export const processExpiredPendingEvents = async () => {
  const connection = await pool.getConnection();
  let escalatedCount = 0;

  try {
    await connection.beginTransaction();

    const [expiredEvents] = await connection.execute(
      `SELECT e.id, e.user_id, e.event_type, u.full_name
       FROM events e
       JOIN users u ON e.user_id = u.id
       WHERE e.status = 'pending' AND e.deadline_at <= UTC_TIMESTAMP(3)
       ORDER BY e.deadline_at ASC, e.id ASC
       LIMIT 20
       FOR UPDATE SKIP LOCKED`
    );

    for (const evt of expiredEvents) {
      await connection.execute(
        `UPDATE events SET status = 'escalated' WHERE id = ? AND status = 'pending'`,
        [evt.id]
      );

      // Bekleyen geri sayım bildirimlerini iptal et
      await connection.execute(
        `UPDATE notifications
         SET status = 'cancelled'
         WHERE event_id = ? AND type = 'countdown' AND status = 'queued'`,
        [evt.id]
      );

      // Kullanıcının aktif acil durum kişilerini getir
      const [contacts] = await connection.execute(
        `SELECT id, linked_user_id, full_name, phone_number
         FROM contacts
         WHERE user_id = ? AND is_active = TRUE
         ORDER BY priority ASC, id ASC`,
        [evt.user_id]
      );

      const title = EVENT_TITLES[evt.event_type] || 'Acil Durum Uyarısı';
      const message = `${evt.full_name} için acil durum geri sayımı tamamlandı (${evt.event_type}). Lütfen durumunu kontrol edin.`;

      for (const contact of contacts) {
        // Aynı olay + kişi için tekrar emergency bildirimi oluşturulmasın
        const [existingNotif] = await connection.execute(
          `SELECT id FROM notifications
           WHERE event_id = ? AND recipient_contact_id = ? AND type = 'emergency'
           LIMIT 1`,
          [evt.id, contact.id]
        );
        if (existingNotif.length > 0) continue;

        if (contact.linked_user_id) {
          await connection.execute(
            `INSERT INTO notifications (
               event_id, recipient_user_id, recipient_contact_id, title, message, type, channel, status
             ) VALUES (?, ?, ?, ?, ?, 'emergency', 'push', 'queued')`,
            [evt.id, contact.linked_user_id, contact.id, title, message]
          );
        } else if (contact.phone_number) {
          await connection.execute(
            `INSERT INTO notifications (
               event_id, recipient_user_id, recipient_contact_id, title, message, type, channel, status
             ) VALUES (?, NULL, ?, ?, ?, 'emergency', 'sms', 'queued')`,
            [evt.id, contact.id, title, message]
          );
        }
      }

      // Kullanıcının kendisine de emergency bildirimi (eğer hiçbir acil kişi yoksa veya bilgi amaçlı)
      const [existingSelf] = await connection.execute(
        `SELECT id FROM notifications
         WHERE event_id = ? AND recipient_user_id = ? AND recipient_contact_id IS NULL AND type = 'emergency'
         LIMIT 1`,
        [evt.id, evt.user_id]
      );
      if (existingSelf.length === 0) {
        await connection.execute(
          `INSERT INTO notifications (
             event_id, recipient_user_id, recipient_contact_id, title, message, type, channel, status
           ) VALUES (?, ?, NULL, ?, ?, 'emergency', 'push', 'queued')`,
          [evt.id, evt.user_id, title, 'Acil durum geri sayımı doldu ve olay yükseltildi.']
        );
      }

      escalatedCount += 1;
    }

    await connection.commit();
    return escalatedCount;
  } catch (err) {
    await connection.rollback();
    console.error('❌ [EventWorker] Hata:', err.message);
    return 0;
  } finally {
    connection.release();
  }
};

let workerTimer = null;

export const startEventWorker = () => {
  if (!env.ENABLE_EVENT_WORKER || workerTimer) return;
  workerTimer = setInterval(() => {
    processExpiredPendingEvents().catch(() => {});
  }, env.EVENT_WORKER_INTERVAL_MS);
  workerTimer.unref();
  console.log(`⏱️  Acil durum geri sayım işçisi aktif (${env.EVENT_WORKER_INTERVAL_MS}ms).`);
};

export const stopEventWorker = () => {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
};
