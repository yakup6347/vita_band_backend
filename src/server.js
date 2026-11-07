import app from './app.js';
import { env } from './config/env.js';
import { testDatabaseConnection, pool } from './config/db.js';

const startServer = async () => {
  // MySQL Bağlantısını Test Et
  await testDatabaseConnection();

  const server = app.listen(env.PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 Vita Band Backend Sunucusu Başlatıldı!`);
    console.log(`📡 URL: http://localhost:${env.PORT}`);
    console.log(`🩺 Health: http://localhost:${env.PORT}/api/v1/health`);
    console.log(`🌍 Ortam: ${env.NODE_ENV}`);
    console.log(`⚡ Modül Formatı: Saf JavaScript (ES Modules)`);
    console.log(`🗄️ Veritabanı: MySQL (mysql2 direct pool)`);
    console.log(`=================================================`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n🛑 ${signal} sinyali alındı. Sunucu kapatılıyor...`);
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
