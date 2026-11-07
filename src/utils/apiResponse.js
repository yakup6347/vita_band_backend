import { HTTP_STATUS } from '../constants/index.js';

export const sendSuccess = (
  res,
  data = null,
  message = 'İşlem başarılı',
  statusCode = HTTP_STATUS.OK
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

export const sendError = (
  res,
  message = 'Bir hata oluştu',
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  error = null
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error,
    timestamp: new Date().toISOString(),
  });
};
