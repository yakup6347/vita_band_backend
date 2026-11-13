import pool from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/index.js';
import { toBool, toIsoUtc, toNum, toStringId } from '../utils/apiResponse.js';

export const formatThreshold = (row) => ({
  user_id: toStringId(row.user_id),
  min_heart_rate_bpm: toNum(row.min_heart_rate_bpm),
  max_heart_rate_bpm: toNum(row.max_heart_rate_bpm),
  min_spo2_percent: toNum(row.min_spo2_percent),
  fall_impact_threshold_g: toNum(row.fall_impact_threshold_g),
  stress_threshold: toNum(row.stress_threshold),
  is_enabled: toBool(row.is_enabled),
  created_at: toIsoUtc(row.created_at),
  updated_at: toIsoUtc(row.updated_at),
});

const parseOptionalPositiveNumber = (val, fieldName) => {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) {
    throw new AppError(
      `${fieldName} 0'dan büyük bir sayı olmalıdır.`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      ERROR_CODES.VALIDATION_ERROR
    );
  }
  return num;
};

export class ThresholdService {
  static async getThresholds(userId) {
    const [rows] = await pool.execute(
      `SELECT user_id, min_heart_rate_bpm, max_heart_rate_bpm, min_spo2_percent,
              fall_impact_threshold_g, stress_threshold, is_enabled, created_at, updated_at
       FROM thresholds
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      throw new AppError(
        'Kullanıcı için eşik değerleri henüz tanımlanmamış.',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    return formatThreshold(rows[0]);
  }

  static async upsertThresholds(userId, body) {
    const minHr = parseOptionalPositiveNumber(body.min_heart_rate_bpm, 'min_heart_rate_bpm');
    const maxHr = parseOptionalPositiveNumber(body.max_heart_rate_bpm, 'max_heart_rate_bpm');

    if (minHr !== null && maxHr !== null && minHr >= maxHr) {
      throw new AppError(
        'min_heart_rate_bpm, max_heart_rate_bpm değerinden küçük olmalıdır.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    let minSpo2 = null;
    if (body.min_spo2_percent !== null && body.min_spo2_percent !== undefined) {
      const spo2 = Number(body.min_spo2_percent);
      if (!Number.isFinite(spo2) || spo2 < 0 || spo2 > 100) {
        throw new AppError(
          'min_spo2_percent 0 ile 100 arasında olmalıdır.',
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      minSpo2 = spo2;
    }

    const fallImpact = parseOptionalPositiveNumber(
      body.fall_impact_threshold_g,
      'fall_impact_threshold_g'
    );

    let stressThreshold = null;
    if (body.stress_threshold !== null && body.stress_threshold !== undefined) {
      const stress = Number(body.stress_threshold);
      if (!Number.isFinite(stress) || stress < 0) {
        throw new AppError(
          'stress_threshold geçerli bir pozitif sayı olmalıdır.',
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      stressThreshold = stress;
    }

    if (body.is_enabled !== undefined && typeof body.is_enabled !== 'boolean') {
      throw new AppError(
        'is_enabled boolean (true/false) olmalıdır.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }
    const isEnabled = body.is_enabled ?? false;

    await pool.execute(
      `INSERT INTO thresholds (
         user_id, min_heart_rate_bpm, max_heart_rate_bpm, min_spo2_percent,
         fall_impact_threshold_g, stress_threshold, is_enabled
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         min_heart_rate_bpm = VALUES(min_heart_rate_bpm),
         max_heart_rate_bpm = VALUES(max_heart_rate_bpm),
         min_spo2_percent = VALUES(min_spo2_percent),
         fall_impact_threshold_g = VALUES(fall_impact_threshold_g),
         stress_threshold = VALUES(stress_threshold),
         is_enabled = VALUES(is_enabled)`,
      [userId, minHr, maxHr, minSpo2, fallImpact, stressThreshold, isEnabled ? 1 : 0]
    );

    return this.getThresholds(userId);
  }
}
