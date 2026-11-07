import { sendError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { env } from '../config/env.js';

export class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.BAD_REQUEST) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Sunucu hatası meydana geldi';

  console.error(`❌ [Hata] ${statusCode} - ${message}`);
  if (err.stack && !env.IS_PROD) {
    console.error(err.stack);
  }

  return sendError(
    res,
    message,
    statusCode,
    env.IS_PROD ? null : { stack: err.stack, details: err.message }
  );
};
