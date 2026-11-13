import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const jwtExpiresRaw = process.env.JWT_EXPIRES_IN || '3600';
const jwtExpiresSec = /^\d+$/.test(jwtExpiresRaw) ? parseInt(jwtExpiresRaw, 10) : 3600;

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'ulgen_app',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ulgen',
  },
  JWT_SECRET: process.env.JWT_SECRET || 'ulgen_jwt_secret_key',
  JWT_EXPIRES_IN: jwtExpiresSec,
  EVENT_COUNTDOWN_SECONDS: parseInt(process.env.EVENT_COUNTDOWN_SECONDS || '30', 10),
  ENABLE_EVENT_WORKER: process.env.ENABLE_EVENT_WORKER !== 'false',
  EVENT_WORKER_INTERVAL_MS: parseInt(process.env.EVENT_WORKER_INTERVAL_MS || '2000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  IS_PROD: process.env.NODE_ENV === 'production',
};
