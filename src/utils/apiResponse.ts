import { Response } from 'express';
import { ApiResponse } from '../types';
import { HTTP_STATUS } from '../constants';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'İşlem başarılı',
  statusCode: number = HTTP_STATUS.OK
): Response => {
  const responsePayload: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(responsePayload);
};

export const sendError = (
  res: Response,
  message = 'Bir hata oluştu',
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  errorDetails?: any
): Response => {
  const responsePayload: ApiResponse = {
    success: false,
    message,
    error: errorDetails,
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(responsePayload);
};
