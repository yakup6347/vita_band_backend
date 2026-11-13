import app from './app.js';
import { env } from './config/env.js';
import { testDatabaseConnection, pool } from './config/db.js';
import { startEventWorker, stopEventWorker } from './workers/event.worker.js';

const startServer = async () => {
  const dbReady = await testDatabaseConnection();
  if (!dbReady) {
    console.warn('⚠️ Veritabanı bağlantısı kurulamadı; yine de HTTP sunucusu başlatılıyor.');
  }

  startEventWorker();

  const server = app.listen(env.PORT, () => {
    console.log('=================================================');
    console.log('🚀 ÜLGEN Backend Sunucusu Başlatıldı!');
    console.log(`📡 URL: http://localhost:${env.PORT}`);
    console.log(`📚 Swagger UI: http://localhost:${env.PORT}/api-docs`);
    console.log(`🩺 Health: http://localhost:${env.PORT}/api/v1/health`);
    console.log(`🌍 Ortam: ${env.NODE_ENV}`);
    console.log('⚡ Modül Formatı: Saf JavaScript (ES Modules)');
    console.log('🗄️  Veritabanı: MySQL (mysql2 UTC pool)');
    console.log('=================================================');
  });

  const shutdown = async (signal) => {
    console.log(`\n🛑 ${signal} sinyali alındı. Sunucu kapatılıyor...`);
    stopEventWorker();
    server.close(async () => {
      await pool.end();
      console.log('✅ Veritabanı havuzu ve sunucu kapatıldı.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer();
