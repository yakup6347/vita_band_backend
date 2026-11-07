import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRouter from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { env } from './config/env';

const app: Application = express();

// Güvenlik ve Yardımcı Middleware'ler
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP İstek Loglaması
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Ana karşılama rotası
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Vita Band IoT Backend API Servisi Çalışıyor 🚀',
    documentation: '/api/v1/health',
    version: '1.0.0',
  });
});

// API Rotaları
app.use('/api/v1', apiRouter);

// 404 Bulunamadı Middleware
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'İstenen API endpoint bulunamadı',
    timestamp: new Date().toISOString(),
  });
});

// Global Hata Yakalama Middleware'i
app.use(errorHandler);

export default app;
