import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/apiResponse';
import { HTTP_STATUS } from '../constants';

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Yetkilendirme belirteci (token) bulunamadı veya geçersiz format', HTTP_STATUS.UNAUTHORIZED);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    sendError(res, 'Oturum süresi dolmuş veya geçersiz token', HTTP_STATUS.UNAUTHORIZED);
  }
};
