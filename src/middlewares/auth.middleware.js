import { verifyToken } from '../utils/jwt.js';
import { sendError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(
      res,
      'Yetkilendirme belirteci (token) eksik veya geçersiz format',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { userId, email }
    next();
  } catch (err) {
    return sendError(
      res,
      'Oturum süresi dolmuş veya geçersiz token',
      HTTP_STATUS.UNAUTHORIZED
    );
  }
};
