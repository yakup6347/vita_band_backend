import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import deviceRoutes from './device.routes.js';
import telemetryRoutes from './telemetry.routes.js';
import alertRoutes from './alert.routes.js';

const router = Router();

// Sağlık kontrolü
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    project: 'Vita Band IoT Backend API (Pure JS + MySQL)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Modül rotaları
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/devices', deviceRoutes);
router.use('/telemetry', telemetryRoutes);
router.use('/alerts', alertRoutes);

export default router;
