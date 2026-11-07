import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { env } from './config/env.js';

const app = express();

// Güvenlik ve ara katmanlar
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP loglama
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Ana karşılama endpoint'i
app.get('/', (_req, res) => {
  res.json({
    message: 'Vita Band IoT Backend API Servisi Çalışıyor 🚀',
    documentation: '/api/v1/health',
    version: '1.0.0',
  });
});

// /api/v1 rotaları
app.use('/api/v1', apiRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'İstenen API endpoint bulunamadı',
    timestamp: new Date().toISOString(),
  });
});

// Global hata yakalama
app.use(errorHandler);

export default app;
