import { sendError } from '../utils/apiResponse.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/index.js';
import { env } from '../config/env.js';

export class AppError extends Error {
  constructor(
    message,
    statusCode = HTTP_STATUS.BAD_REQUEST,
    code = null,
    details = null
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || AppError.defaultCodeForStatus(statusCode);
    this.details = details;
  }

  static defaultCodeForStatus(statusCode) {
    switch (statusCode) {
      case HTTP_STATUS.BAD_REQUEST:
        return ERROR_CODES.BAD_REQUEST;
      case HTTP_STATUS.UNAUTHORIZED:
        return ERROR_CODES.UNAUTHORIZED;
      case HTTP_STATUS.FORBIDDEN:
        return ERROR_CODES.FORBIDDEN;
      case HTTP_STATUS.NOT_FOUND:
        return ERROR_CODES.NOT_FOUND;
      case HTTP_STATUS.CONFLICT:
        return ERROR_CODES.CONFLICT;
      case HTTP_STATUS.UNPROCESSABLE_ENTITY:
        return ERROR_CODES.VALIDATION_ERROR;
      default:
        return ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
  }
}

export const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let code = err.code || ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Sunucu hatası meydana geldi.';
  let details = err.details ?? null;

  // Express JSON body syntax hatasi
  if (err.type === 'entity.parse.failed') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.BAD_REQUEST;
    message = 'Geçersiz JSON formatı.';
  } else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = HTTP_STATUS.CONFLICT;
    code = ERROR_CODES.CONFLICT;
    message = 'Mükerrer kayıt tespit edildi.';
  } else if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Veritabanı veri doğrulama kuralı ihlal edildi.';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = HTTP_STATUS.NOT_FOUND;
    code = ERROR_CODES.NOT_FOUND;
    message = 'İlişkili kayıt bulunamadı.';
  }

  if (statusCode >= 500) {
    console.error(`❌ [Hata] ${statusCode} - ${message}`);
    if (err.stack && !env.IS_PROD) {
      console.error(err.stack);
    }
    if (env.IS_PROD) {
      message = 'Sunucu hatası meydana geldi.';
      details = null;
    }
  }

  return sendError(res, message, statusCode, code, details);
};
