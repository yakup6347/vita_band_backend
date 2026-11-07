import pool from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { HEALTH_THRESHOLDS, HTTP_STATUS } from '../constants/index.js';
import { AlertService } from './alert.service.js';

export class TelemetryService {
  // Tekil telemetri ölçümünü kaydet (BLE -> Mobil -> Backend)
  static async recordTelemetry(userId, data) {
    const {
      macAddress,
      heartRate,
      spo2,
      temperature,
      stepCount = 0,
      calories = 0,
      fallDetected = false,
      accelX = null,
      accelY = null,
      accelZ = null,
      batteryLevel = null,
      recordedAt = new Date(),
    } = data;

    if (!macAddress) {
      throw new AppError('Cihaz MAC adresi zorunludur', HTTP_STATUS.BAD_REQUEST);
    }

    // 1. MAC adresinden cihazı bul
    const [devices] = await pool.execute(
      'SELECT id, user_id FROM devices WHERE mac_address = ? LIMIT 1',
      [macAddress]
    );

    if (devices.length === 0) {
      throw new AppError('Sistemde bu MAC adresine ait bir cihaz bulunamadı', HTTP_STATUS.NOT_FOUND);
    }

    const device = devices[0];
    const deviceId = device.id;
    const finalUserId = device.user_id || userId;

    // 2. Telemetriyi kaydet
    const [result] = await pool.execute(
      `INSERT INTO telemetries 
       (device_id, heart_rate, spo2, temperature, step_count, calories, fall_detected, accel_x, accel_y, accel_z, battery_level, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deviceId,
        heartRate || null,
        spo2 || null,
        temperature || null,
        stepCount,
        calories,
        fallDetected ? 1 : 0,
        accelX,
        accelY,
        accelZ,
        batteryLevel,
        new Date(recordedAt),
      ]
    );

    // 3. Cihazın son senkronizasyon ve pil bilgisini güncelle
    await pool.execute(
      `UPDATE devices 
       SET last_sync_at = NOW(), is_online = 1, battery_level = COALESCE(?, battery_level)
       WHERE id = ?`,
      [batteryLevel, deviceId]
    );

    // 4. Eşik değerleri kontrol et ve gerekirse alarm oluştur
    await this.checkThresholdsAndTriggerAlerts(deviceId, finalUserId, data);

    const [saved] = await pool.execute('SELECT * FROM telemetries WHERE id = ?', [result.insertId]);
    return saved[0];
  }

  // Toplu telemetri kaydetme (Çevrimdışı birikmiş ölçümler için)
  static async recordBatchTelemetry(userId, macAddress, readings) {
    if (!macAddress || !Array.isArray(readings) || readings.length === 0) {
      throw new AppError('Geçersiz veri formatı', HTTP_STATUS.BAD_REQUEST);
    }

    const [devices] = await pool.execute(
      'SELECT id, user_id FROM devices WHERE mac_address = ? LIMIT 1',
      [macAddress]
    );

    if (devices.length === 0) {
      throw new AppError('Cihaz bulunamadı', HTTP_STATUS.NOT_FOUND);
    }

    const device = devices[0];
    const deviceId = device.id;

    // Çoklu ekleme (Multi-row INSERT)
    const values = [];
    const placeholders = readings.map((r) => {
      values.push(
        deviceId,
        r.heartRate || null,
        r.spo2 || null,
        r.temperature || null,
        r.stepCount || 0,
        r.calories || 0,
        r.fallDetected ? 1 : 0,
        r.accelX || null,
        r.accelY || null,
        r.accelZ || null,
        r.batteryLevel || null,
        new Date(r.recordedAt || Date.now())
      );
      return '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    });

    const sql = `
      INSERT INTO telemetries 
      (device_id, heart_rate, spo2, temperature, step_count, calories, fall_detected, accel_x, accel_y, accel_z, battery_level, recorded_at)
      VALUES ${placeholders.join(', ')}
    `;

    await pool.execute(sql, values);

    // Son pil seviyesini güncelle
    const lastReading = readings[readings.length - 1];
    if (lastReading && lastReading.batteryLevel !== undefined) {
      await pool.execute('UPDATE devices SET battery_level = ?, last_sync_at = NOW(), is_online = 1 WHERE id = ?', [
        lastReading.batteryLevel,
        deviceId,
      ]);
    }

    return { savedCount: readings.length };
  }

  // Cihazın geçmiş telemetri verilerini sorgulama
  static async getHistory(userId, deviceId, { limit = 100, startDate, endDate }) {
    // Cihaz kullanıcıya mı ait doğrula
    const [devices] = await pool.execute(
      'SELECT id FROM devices WHERE id = ? AND user_id = ? LIMIT 1',
      [deviceId, userId]
    );

    if (devices.length === 0) {
      throw new AppError('Cihaz bulunamadı veya yetkiniz yok', HTTP_STATUS.NOT_FOUND);
    }

    let sql = 'SELECT * FROM telemetries WHERE device_id = ?';
    const params = [deviceId];

    if (startDate) {
      sql += ' AND recorded_at >= ?';
      params.push(new Date(startDate));
    }
    if (endDate) {
      sql += ' AND recorded_at <= ?';
      params.push(new Date(endDate));
    }

    sql += ' ORDER BY recorded_at DESC LIMIT ?';
    params.push(Math.min(parseInt(limit, 10) || 100, 1000));

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  // Eşik kontrolleri
  static async checkThresholdsAndTriggerAlerts(deviceId, userId, data) {
    const { HEART_RATE, SPO2, TEMPERATURE, BATTERY } = HEALTH_THRESHOLDS;

    // Düşme Algılandı
    if (data.fallDetected) {
      await AlertService.createAlert({
        deviceId,
        userId,
        type: 'FALL_DETECTED',
        severity: 'CRITICAL',
        message: 'Düşme algılandı! Kullanıcının acil durumu kontrol edilmelidir.',
      });
    }

    // Kritik Yüksek Nabız
    if (data.heartRate && data.heartRate >= HEART_RATE.CRITICAL_HIGH) {
      await AlertService.createAlert({
        deviceId,
        userId,
        type: 'HIGH_HEART_RATE',
        severity: 'HIGH',
        message: `Kritik yüksek nabız algılandı: ${data.heartRate} BPM`,
      });
    }

    // Kritik Düşük Nabız
    if (data.heartRate && data.heartRate <= HEART_RATE.CRITICAL_LOW) {
      await AlertService.createAlert({
        deviceId,
        userId,
        type: 'LOW_HEART_RATE',
        severity: 'HIGH',
        message: `Kritik düşük nabız algılandı: ${data.heartRate} BPM`,
      });
    }

    // Kritik Düşük SpO2 (Oksijen)
    if (data.spo2 && data.spo2 <= SPO2.CRITICAL_LOW) {
      await AlertService.createAlert({
        deviceId,
        userId,
        type: 'LOW_SPO2',
        severity: 'CRITICAL',
        message: `Kritik düşük kandaki oksijen seviyesi: %${data.spo2}`,
      });
    }

    // Yüksek Ateş
    if (data.temperature && data.temperature >= TEMPERATURE.HIGH_FEVER) {
      await AlertService.createAlert({
        deviceId,
        userId,
        type: 'HIGH_TEMPERATURE',
        severity: 'HIGH',
        message: `Yüksek vücut sıcaklığı algılandı: ${data.temperature}°C`,
      });
    }

    // Kritik Düşük Batarya
    if (data.batteryLevel !== null && data.batteryLevel !== undefined && data.batteryLevel <= BATTERY.CRITICAL_LOW) {
      await AlertService.createAlert({
        deviceId,
        userId,
        type: 'LOW_BATTERY',
        severity: 'LOW',
        message: `Bileklik bataryası kritik seviyede: %${data.batteryLevel}`,
      });
    }
  }
}
