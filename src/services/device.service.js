import pool from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { HTTP_STATUS } from '../constants/index.js';

export class DeviceService {
  // Cihazı kullanıcı ile eşleştir veya kaydet
  static async pairDevice(userId, { macAddress, deviceName, serialNumber, firmwareVer }) {
    if (!macAddress || !deviceName) {
      throw new AppError('MAC adresi ve cihaz adı zorunludur', HTTP_STATUS.BAD_REQUEST);
    }

    // Cihaz önceden eklenmiş mi kontrol et
    const [existing] = await pool.execute(
      'SELECT id FROM devices WHERE mac_address = ? LIMIT 1',
      [macAddress]
    );

    if (existing.length > 0) {
      // Cihazı güncelle ve bu kullanıcıya ata
      const deviceId = existing[0].id;
      await pool.execute(
        `UPDATE devices 
         SET user_id = ?, device_name = ?, serial_number = COALESCE(?, serial_number), 
             firmware_version = COALESCE(?, firmware_version), is_online = 1, last_sync_at = NOW()
         WHERE id = ?`,
        [userId, deviceName, serialNumber || null, firmwareVer || null, deviceId]
      );

      const [updated] = await pool.execute('SELECT * FROM devices WHERE id = ?', [deviceId]);
      return updated[0];
    }

    // Yeni cihaz ekle
    const [result] = await pool.execute(
      `INSERT INTO devices (user_id, mac_address, device_name, serial_number, firmware_version, is_online, last_sync_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [userId, macAddress, deviceName, serialNumber || null, firmwareVer || null]
    );

    const [created] = await pool.execute('SELECT * FROM devices WHERE id = ?', [result.insertId]);
    return created[0];
  }

  // Kullanıcının kayıtlı cihazlarını listele
  static async getUserDevices(userId) {
    const [devices] = await pool.execute(
      'SELECT * FROM devices WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return devices;
  }

  // Cihaz detayı ve son sensör verisi
  static async getDeviceDetails(userId, deviceId) {
    const [devices] = await pool.execute(
      'SELECT * FROM devices WHERE id = ? AND user_id = ? LIMIT 1',
      [deviceId, userId]
    );

    if (devices.length === 0) {
      throw new AppError('Cihaz bulunamadı veya yetkiniz yok', HTTP_STATUS.NOT_FOUND);
    }

    const device = devices[0];

    // Son telemetri kaydı
    const [latestTelemetry] = await pool.execute(
      'SELECT * FROM telemetries WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 1',
      [deviceId]
    );

    // Çözülmemiş son uyarılar
    const [activeAlerts] = await pool.execute(
      'SELECT * FROM alerts WHERE device_id = ? AND is_resolved = 0 ORDER BY created_at DESC LIMIT 5',
      [deviceId]
    );

    return {
      ...device,
      latestTelemetry: latestTelemetry[0] || null,
      activeAlerts,
    };
  }

  // Cihaz güncelle
  static async updateDevice(userId, deviceId, { deviceName, batteryLevel, isOnline }) {
    const [devices] = await pool.execute(
      'SELECT id FROM devices WHERE id = ? AND user_id = ? LIMIT 1',
      [deviceId, userId]
    );

    if (devices.length === 0) {
      throw new AppError('Cihaz bulunamadı veya yetkiniz yok', HTTP_STATUS.NOT_FOUND);
    }

    const updates = [];
    const values = [];

    if (deviceName !== undefined) {
      updates.push('device_name = ?');
      values.push(deviceName);
    }
    if (batteryLevel !== undefined) {
      updates.push('battery_level = ?');
      values.push(batteryLevel);
    }
    if (isOnline !== undefined) {
      updates.push('is_online = ?');
      values.push(isOnline ? 1 : 0);
    }

    updates.push('last_sync_at = NOW()');
    values.push(deviceId);

    await pool.execute(
      `UPDATE devices SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [updated] = await pool.execute('SELECT * FROM devices WHERE id = ?', [deviceId]);
    return updated[0];
  }
}
