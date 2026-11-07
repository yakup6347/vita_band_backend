export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// Vita Band Sağlık Eşik Değerleri (Otomatik Alarm Üretimi)
export const HEALTH_THRESHOLDS = {
  HEART_RATE: {
    MIN_NORMAL: 50,  // BPM
    MAX_NORMAL: 110, // BPM
    CRITICAL_HIGH: 140,
    CRITICAL_LOW: 40,
  },
  SPO2: {
    MIN_NORMAL: 95, // %
    CRITICAL_LOW: 88,
  },
  TEMPERATURE: {
    MIN_NORMAL: 35.5, // °C
    MAX_NORMAL: 37.5,
    HIGH_FEVER: 38.5,
  },
  BATTERY: {
    CRITICAL_LOW: 15, // %
  },
};
