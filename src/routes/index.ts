import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import deviceRoutes from './device.routes';
import telemetryRoutes from './telemetry.routes';
import alertRoutes from './alert.routes';

const router = Router();

// API Health Check & Info
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    project: 'Vita Band IoT Backend',
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
