import crypto from 'crypto';
import pool from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/index.js';
import {
  parsePagination,
  toBool,
  toIsoUtc,
  toNum,
  toStringId,
} from '../utils/apiResponse.js';
import { formatDevice } from './device.service.js';
import { EventService } from './event.service.js';

export const formatMeasurement = (row) => ({
  id: toStringId(row.id),
  device_id: toStringId(row.device_id),
  sample_id: row.sample_id,
  measured_at: toIsoUtc(row.measured_at),
  received_at: toIsoUtc(row.received_at),
  heart_rate_bpm: toNum(row.heart_rate_bpm),
  spo2_percent: toNum(row.spo2_percent),
  gsr_raw: toNum(row.gsr_raw),
  stress_index: toNum(row.stress_index),
  movement: row.movement,
  wear_detected: toBool(row.wear_detected),
  heart_rate_valid: toBool(row.heart_rate_valid),
  spo2_valid: toBool(row.spo2_valid),
  gsr_valid: toBool(row.gsr_valid),
  stress_valid: toBool(row.stress_valid),
});

const normalizeNullableNumber = (val) => {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  if (!Number.isFinite(num)) return NaN;
  return num;
};

const buildEventKey = (sampleId, eventType) => {
  const raw = `${sampleId}-${eventType}`;
  if (raw.length <= 64) return raw;
  const hash = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 12);
  return `${sampleId.slice(0, 40)}-${hash}`;
};

const nearlyEqual = (a, b) => {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(Number(a) - Number(b)) < 0.001;
};

const isSameMeasurementPayload = (existingRow, incoming) => {
  const existingTime = new Date(existingRow.measured_at).getTime();
  const incomingTime = incoming.measuredAt.getTime();
  if (Math.abs(existingTime - incomingTime) > 1) return false;

  return (
    nearlyEqual(existingRow.heart_rate_bpm, incoming.heartRateBpm) &&
    nearlyEqual(existingRow.spo2_percent, incoming.spo2Percent) &&
    nearlyEqual(existingRow.gsr_raw, incoming.gsrRaw) &&
    nearlyEqual(existingRow.stress_index, incoming.stressIndex) &&
    existingRow.movement === incoming.movement &&
    toBool(existingRow.wear_detected) === incoming.wearDetected &&
    toBool(existingRow.heart_rate_valid) === incoming.heartRateValid &&
    toBool(existingRow.spo2_valid) === incoming.spo2Valid &&
    toBool(existingRow.gsr_valid) === incoming.gsrValid &&
    toBool(existingRow.stress_valid) === incoming.stressValid
  );
};

export class MeasurementService {
  static async recordMeasurement(device, body) {
    const sampleId = typeof body.sample_id === 'string' ? body.sample_id.trim() : '';
    if (!sampleId || sampleId.length > 64) {
      throw new AppError(
        'Geçerli bir sample_id (1-64 karakter) zorunludur.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (!body.measured_at) {
      throw new AppError(
        'measured_at (ISO 8601 UTC tarih) zorunludur.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const measuredAt = new Date(body.measured_at);
    if (Number.isNaN(measuredAt.getTime())) {
      throw new AppError(
        'measured_at geçerli bir tarih olmalıdır.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const heartRateBpm = normalizeNullableNumber(body.heart_rate_bpm);
    const spo2Percent = normalizeNullableNumber(body.spo2_percent);
    const gsrRaw = normalizeNullableNumber(body.gsr_raw);
    const stressIndex = normalizeNullableNumber(body.stress_index);

    if (
      Number.isNaN(heartRateBpm) ||
      Number.isNaN(spo2Percent) ||
      Number.isNaN(gsrRaw) ||
      Number.isNaN(stressIndex)
    ) {
      throw new AppError(
        'Sensör ölçüm alanları sayısal değer veya null olmalıdır.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (spo2Percent !== null && (spo2Percent < 0 || spo2Percent > 100)) {
      throw new AppError(
        'spo2_percent 0 ile 100 arasında olmalıdır.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (gsrRaw !== null && (!Number.isInteger(gsrRaw) || gsrRaw < 0)) {
      throw new AppError(
        'gsr_raw negatif olmayan tam sayı olmalıdır.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const movement =
      typeof body.movement === 'string' && body.movement.trim()
        ? body.movement.trim().slice(0, 32)
        : 'unknown';

    const wearDetected =
      body.wear_detected === null || body.wear_detected === undefined
        ? null
        : Boolean(body.wear_detected);

    const heartRateValid = Boolean(body.heart_rate_valid);
    const spo2Valid = Boolean(body.spo2_valid);
    const gsrValid = Boolean(body.gsr_valid);
    const stressValid = Boolean(body.stress_valid);

    if (
      (heartRateValid && heartRateBpm === null) ||
      (spo2Valid && spo2Percent === null) ||
      (gsrValid && gsrRaw === null) ||
      (stressValid && stressIndex === null)
    ) {
      throw new AppError(
        'Geçerli (*_valid = true) işaretlenen sensör ölçüm değeri null olamaz.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const incoming = {
      measuredAt,
      heartRateBpm,
      spo2Percent,
      gsrRaw,
      stressIndex,
      movement,
      wearDetected,
      heartRateValid,
      spo2Valid,
      gsrValid,
      stressValid,
    };

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Aynı (device_id, sample_id) varsa idempotent veya çakışma kontrolü yap
      const [existing] = await connection.execute(
        'SELECT * FROM measurements WHERE device_id = ? AND sample_id = ? LIMIT 1',
        [device.id, sampleId]
      );

      if (existing.length > 0) {
        const row = existing[0];
        if (!isSameMeasurementPayload(row, incoming)) {
          throw new AppError(
            'Bu sample_id daha önce farklı sensör verileriyle kaydedilmiş.',
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.CONFLICT
          );
        }
        await connection.commit();
        return {
          created: false,
          measurement: {
            measurement_id: toStringId(row.id),
            device_id: toStringId(row.device_id),
            sample_id: row.sample_id,
            measured_at: toIsoUtc(row.measured_at),
            received_at: toIsoUtc(row.received_at),
          },
        };
      }

      const [insertRes] = await connection.execute(
        `INSERT INTO measurements (
           device_id, sample_id, measured_at,
           heart_rate_bpm, spo2_percent, gsr_raw, stress_index,
           movement, wear_detected,
           heart_rate_valid, spo2_valid, gsr_valid, stress_valid
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          device.id,
          sampleId,
          measuredAt,
          heartRateBpm,
          spo2Percent,
          gsrRaw,
          stressIndex,
          movement,
          wearDetected === null ? null : wearDetected ? 1 : 0,
          heartRateValid ? 1 : 0,
          spo2Valid ? 1 : 0,
          gsrValid ? 1 : 0,
          stressValid ? 1 : 0,
        ]
      );

      const measurementId = insertRes.insertId;

      await connection.execute(
        `UPDATE devices
         SET is_active = TRUE, last_seen_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [device.id]
      );

      // Eşik değerlendirmesi ve acil durum olayı oluşturma
      await this.evaluateThresholdsAndCreateEvents(connection, {
        userId: device.user_id,
        deviceId: device.id,
        measurementId,
        sampleId,
        measuredAt,
        heartRateBpm,
        spo2Percent,
        stressIndex,
        movement,
        heartRateValid,
        spo2Valid,
        stressValid,
        fallDetected: body.fall_detected === true,
        impactG:
          body.impact_g !== undefined && body.impact_g !== null
            ? Number(body.impact_g)
            : null,
      });

      const [savedRows] = await connection.execute(
        'SELECT id, device_id, sample_id, measured_at, received_at FROM measurements WHERE id = ? LIMIT 1',
        [measurementId]
      );

      await connection.commit();

      const saved = savedRows[0];
      return {
        created: true,
        measurement: {
          measurement_id: toStringId(saved.id),
          device_id: toStringId(saved.device_id),
          sample_id: saved.sample_id,
          measured_at: toIsoUtc(saved.measured_at),
          received_at: toIsoUtc(saved.received_at),
        },
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  static async evaluateThresholdsAndCreateEvents(connection, ctx) {
    const [threshRows] = await connection.execute(
      'SELECT * FROM thresholds WHERE user_id = ? LIMIT 1',
      [ctx.userId]
    );

    const thresh = threshRows[0];
    const triggeredTypes = [];

    const isFallByFlag = ctx.fallDetected || ctx.movement === 'fall';
    const isFallByImpact =
      thresh &&
      Number(thresh.is_enabled) === 1 &&
      thresh.fall_impact_threshold_g !== null &&
      ctx.impactG !== null &&
      Number.isFinite(ctx.impactG) &&
      ctx.impactG >= Number(thresh.fall_impact_threshold_g);

    if (isFallByFlag || isFallByImpact) {
      triggeredTypes.push('fall');
    }

    if (thresh && Number(thresh.is_enabled) === 1) {
      if (ctx.heartRateValid && ctx.heartRateBpm !== null) {
        if (
          thresh.max_heart_rate_bpm !== null &&
          ctx.heartRateBpm >= Number(thresh.max_heart_rate_bpm)
        ) {
          triggeredTypes.push('high_heart_rate');
        }
        if (
          thresh.min_heart_rate_bpm !== null &&
          ctx.heartRateBpm <= Number(thresh.min_heart_rate_bpm)
        ) {
          triggeredTypes.push('low_heart_rate');
        }
      }

      if (ctx.spo2Valid && ctx.spo2Percent !== null) {
        if (
          thresh.min_spo2_percent !== null &&
          ctx.spo2Percent <= Number(thresh.min_spo2_percent)
        ) {
          triggeredTypes.push('low_spo2');
        }
      }

      if (ctx.stressValid && ctx.stressIndex !== null) {
        if (
          thresh.stress_threshold !== null &&
          ctx.stressIndex >= Number(thresh.stress_threshold)
        ) {
          triggeredTypes.push('high_stress');
        }
      }
    }

    for (const eventType of triggeredTypes) {
      await EventService.createPendingEvent(connection, {
        userId: ctx.userId,
        deviceId: ctx.deviceId,
        measurementId: ctx.measurementId,
        eventKey: buildEventKey(ctx.sampleId, eventType),
        eventType,
        detectedAt: ctx.measuredAt,
      });
    }
  }

  static async getLastValidValues(userId) {
    const [hrRows] = await pool.execute(
      `SELECT m.heart_rate_bpm, m.measured_at
       FROM measurements m
       JOIN devices d ON m.device_id = d.id
       WHERE d.user_id = ? AND m.heart_rate_valid = TRUE AND m.heart_rate_bpm IS NOT NULL
       ORDER BY m.measured_at DESC, m.id DESC
       LIMIT 1`,
      [userId]
    );

    const [spo2Rows] = await pool.execute(
      `SELECT m.spo2_percent, m.measured_at
       FROM measurements m
       JOIN devices d ON m.device_id = d.id
       WHERE d.user_id = ? AND m.spo2_valid = TRUE AND m.spo2_percent IS NOT NULL
       ORDER BY m.measured_at DESC, m.id DESC
       LIMIT 1`,
      [userId]
    );

    const [gsrRows] = await pool.execute(
      `SELECT m.gsr_raw, m.measured_at
       FROM measurements m
       JOIN devices d ON m.device_id = d.id
       WHERE d.user_id = ? AND m.gsr_valid = TRUE AND m.gsr_raw IS NOT NULL
       ORDER BY m.measured_at DESC, m.id DESC
       LIMIT 1`,
      [userId]
    );

    const [stressRows] = await pool.execute(
      `SELECT m.stress_index, m.measured_at
       FROM measurements m
       JOIN devices d ON m.device_id = d.id
       WHERE d.user_id = ? AND m.stress_valid = TRUE AND m.stress_index IS NOT NULL
       ORDER BY m.measured_at DESC, m.id DESC
       LIMIT 1`,
      [userId]
    );

    return {
      heart_rate_bpm: hrRows[0]
        ? {
            value: toNum(hrRows[0].heart_rate_bpm),
            measured_at: toIsoUtc(hrRows[0].measured_at),
          }
        : null,
      spo2_percent: spo2Rows[0]
        ? {
            value: toNum(spo2Rows[0].spo2_percent),
            measured_at: toIsoUtc(spo2Rows[0].measured_at),
          }
        : null,
      gsr_raw: gsrRows[0]
        ? {
            value: toNum(gsrRows[0].gsr_raw),
            measured_at: toIsoUtc(gsrRows[0].measured_at),
          }
        : null,
      stress_index: stressRows[0]
        ? {
            value: toNum(stressRows[0].stress_index),
            measured_at: toIsoUtc(stressRows[0].measured_at),
          }
        : null,
    };
  }

  static async getLatestMeasurement(userId) {
    const [latestRows] = await pool.execute(
      `SELECT m.*
       FROM measurements m
       JOIN devices d ON m.device_id = d.id
       WHERE d.user_id = ?
       ORDER BY m.measured_at DESC, m.id DESC
       LIMIT 1`,
      [userId]
    );

    const lastValid = await this.getLastValidValues(userId);

    return {
      measurement: latestRows[0] ? formatMeasurement(latestRows[0]) : null,
      last_valid: lastValid,
    };
  }

  static async getMeasurementHistory(userId, query) {
    const { page, limit, offset } = parsePagination(query);
    const whereClauses = ['d.user_id = ?'];
    const params = [userId];

    if (query.start_date) {
      const start = new Date(query.start_date);
      if (Number.isNaN(start.getTime())) {
        throw new AppError(
          'Geçersiz start_date parametresi.',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST
        );
      }
      whereClauses.push('m.measured_at >= ?');
      params.push(start);
    }

    if (query.end_date) {
      const end = new Date(query.end_date);
      if (Number.isNaN(end.getTime())) {
        throw new AppError(
          'Geçersiz end_date parametresi.',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.BAD_REQUEST
        );
      }
      whereClauses.push('m.measured_at <= ?');
      params.push(end);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM measurements m
       JOIN devices d ON m.device_id = d.id
       WHERE ${whereSql}`,
      params
    );

    const total = Number(countRows[0].total);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const [rows] = await pool.query(
      `SELECT m.*
       FROM measurements m
       JOIN devices d ON m.device_id = d.id
       WHERE ${whereSql}
       ORDER BY m.measured_at DESC, m.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      measurements: rows.map(formatMeasurement),
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };
  }

  static async getHealthSummary(userId) {
    const [latestRows] = await pool.execute(
      `SELECT m.*
       FROM measurements m
       JOIN devices d ON m.device_id = d.id
       WHERE d.user_id = ?
       ORDER BY m.measured_at DESC, m.id DESC
       LIMIT 1`,
      [userId]
    );

    const [deviceRows] = await pool.execute(
      `SELECT id, name, battery_level, is_active, last_seen_at, created_at, updated_at
       FROM devices
       WHERE user_id = ?
       ORDER BY is_active DESC, last_seen_at DESC, id DESC
       LIMIT 1`,
      [userId]
    );

    const [eventCountRows] = await pool.execute(
      `SELECT COUNT(*) AS active_count
       FROM events
       WHERE user_id = ? AND status IN ('pending', 'escalated')`,
      [userId]
    );

    const latest = latestRows[0];
    const lastValid = await this.getLastValidValues(userId);
    const dev = deviceRows[0];

    return {
      user_id: toStringId(userId),
      latest_measurement: latest
        ? {
            heart_rate_bpm: toNum(latest.heart_rate_bpm),
            spo2_percent: toNum(latest.spo2_percent),
            gsr_raw: toNum(latest.gsr_raw),
            stress_index: toNum(latest.stress_index),
            movement: latest.movement,
            wear_detected: toBool(latest.wear_detected),
            heart_rate_valid: toBool(latest.heart_rate_valid),
            spo2_valid: toBool(latest.spo2_valid),
            gsr_valid: toBool(latest.gsr_valid),
            stress_valid: toBool(latest.stress_valid),
            measured_at: toIsoUtc(latest.measured_at),
            received_at: toIsoUtc(latest.received_at),
          }
        : null,
      last_valid_measurement: lastValid,
      device: dev
        ? {
            id: toStringId(dev.id),
            name: dev.name,
            battery_level: toNum(dev.battery_level),
            is_active: toBool(dev.is_active),
            last_seen_at: toIsoUtc(dev.last_seen_at),
            created_at: toIsoUtc(dev.created_at),
            updated_at: toIsoUtc(dev.updated_at),
          }
        : null,
      active_event_count: Number(eventCountRows[0].active_count),
    };
  }
}
