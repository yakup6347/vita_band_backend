import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import { devicesRouter, deviceAgentRouter } from './device.routes.js';
import eventRoutes from './event.routes.js';
import meRoutes from './me.routes.js';
import accessRoutes from './access.routes.js';
import notificationRoutes from './notification.routes.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

// Sağlık kontrolü
router.get('/health', (_req, res) => {
  return sendSuccess(
    res,
    {
      status: 'ok',
      project: 'ÜLGEN Backend API v1.1 (Node.js + Pure JS + MySQL)',
      version: '1.1.0',
      timestamp: new Date().toISOString(),
    },
    'Servis sağlıklı.'
  );
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/devices', devicesRouter);
router.use('/device', deviceAgentRouter);
router.use('/events', eventRoutes);
router.use('/me', meRoutes);
router.use('/access', accessRoutes);
router.use('/notifications', notificationRoutes);

export default router;
