import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants';
import { env } from '../config/env';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = HTTP_STATUS.BAD_REQUEST) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Sunucu hatası meydana geldi';

  console.error(`❌ [Error Handler] ${statusCode} - ${message}`);
  if (err.stack && !env.IS_PROD) {
    console.error(err.stack);
  }

  sendError(
    res,
    message,
    statusCode,
    env.IS_PROD ? undefined : { stack: err.stack, details: err }
  );
};
