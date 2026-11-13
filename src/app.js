import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import { sendError, sendSuccess } from './utils/apiResponse.js';
import { ERROR_CODES, HTTP_STATUS } from './constants/index.js';

const app = express();

// Güvenlik ve ara katmanlar (Swagger UI inline script/style desteği için CSP kapalı)
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP loglama
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Swagger / OpenAPI Dokümantasyonu
const swaggerUiOptions = {
  customSiteTitle: 'ÜLGEN API Docs (Swagger)',
  swaggerOptions: {
    persistAuthorization: true,
  },
};

app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.status(HTTP_STATUS.OK).send(swaggerSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Ana karşılama endpoint'i
app.get('/', (_req, res) => {
  return sendSuccess(
    res,
    {
      documentation: '/api-docs',
      openapi_json: '/api-docs.json',
      health: '/api/v1/health',
      version: '1.1.0',
    },
    'ÜLGEN IoT Backend API Servisi Çalışıyor.'
  );
});

// /api/v1 rotaları
app.use('/api/v1', apiRouter);

// 404 handler
app.use((_req, res) => {
  return sendError(
    res,
    'İstenen API endpoint bulunamadı.',
    HTTP_STATUS.NOT_FOUND,
    ERROR_CODES.NOT_FOUND
  );
});

// Global hata yakalama
app.use(errorHandler);

export default app;
