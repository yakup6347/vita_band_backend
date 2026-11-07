import pool from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { HTTP_STATUS } from '../constants/index.js';

export class AlertService {
  // Yeni acil durum/uyarı oluştur
  static async createAlert({ deviceId, userId, type, severity = 'MEDIUM', message }) {
    const [result] = await pool.execute(
      `INSERT INTO alerts (device_id, user_id, type, severity, message)
       VALUES (?, ?, ?, ?, ?)`,
      [deviceId, userId, type, severity, message]
    );

    const [created] = await pool.execute('SELECT * FROM alerts WHERE id = ?', [result.insertId]);
    return created[0];
  }

  // Kullanıcının uyarılarını listele
  static async getUserAlerts(userId, isResolved) {
    let sql = `
      SELECT a.*, d.device_name, d.mac_address 
      FROM alerts a
      LEFT JOIN devices d ON a.device_id = d.id
      WHERE a.user_id = ?
    `;
    const params = [userId];

    if (isResolved !== undefined) {
      sql += ' AND a.is_resolved = ?';
      params.push(isResolved ? 1 : 0);
    }

    sql += ' ORDER BY a.created_at DESC';

    const [alerts] = await pool.execute(sql, params);
    return alerts;
  }

  // Uyarıyı çözüldü yap
  static async resolveAlert(userId, alertId) {
    const [alerts] = await pool.execute(
      'SELECT id FROM alerts WHERE id = ? AND user_id = ? LIMIT 1',
      [alertId, userId]
    );

    if (alerts.length === 0) {
      throw new AppError('Uyarı bulunamadı veya yetkiniz yok', HTTP_STATUS.NOT_FOUND);
    }

    await pool.execute(
      'UPDATE alerts SET is_resolved = 1, resolved_at = NOW() WHERE id = ?',
      [alertId]
    );

    const [updated] = await pool.execute('SELECT * FROM alerts WHERE id = ?', [alertId]);
    return updated[0];
  }
}
