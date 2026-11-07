import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';

const startServer = async () => {
  // MySQL Veritabanı bağlantısı denemesi
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 Vita Band Backend Sunucusu Başlatıldı!`);
    console.log(`📡 URL: http://localhost:${env.PORT}`);
    console.log(`🩺 Health: http://localhost:${env.PORT}/api/v1/health`);
    console.log(`🌍 Ortam: ${env.NODE_ENV}`);
    console.log(`===============================================`);
  });

  // Graceful shutdown (Kapanma sinyalleri)
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 ${signal} sinyali alındı. Sunucu kapatılıyor...`);
    server.close(async () => {
      await disconnectDatabase();
      console.log('✅ Sunucu ve veritabanı bağlantıları temiz bir şekilde sonlandırıldı.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer();
