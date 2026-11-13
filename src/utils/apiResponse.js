import { ERROR_CODES, HTTP_STATUS } from '../constants/index.js';

export const sendSuccess = (
  res,
  data = {},
  message = 'İşlem başarılı.',
  statusCode = HTTP_STATUS.OK
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (
  res,
  message = 'İşlem gerçekleştirilemedi.',
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  code = ERROR_CODES.INTERNAL_SERVER_ERROR,
  details = null
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      details,
    },
  });
};

export const toStringId = (value) => {
  if (value === null || value === undefined) return null;
  return String(value);
};

export const toIsoUtc = (value) => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const str = String(value).trim();
  if (!str) return null;
  // MySQL DATETIME stringi timezone icermiyorsa UTC kabul et
  const normalized =
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)
      ? `${str.replace(' ', 'T')}Z`
      : str;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const toBool = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return value === '1' || value === 'true';
};

export const toNum = (value) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

export const parsePagination = (query) => {
  const pageRaw = parseInt(query?.page ?? '1', 10);
  const limitRaw = parseInt(query?.limit ?? '20', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};
