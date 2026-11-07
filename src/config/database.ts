import { PrismaClient } from '@prisma/client';

// Global PrismaClient instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('✅ MySQL Veritabanına başarıyla bağlanıldı (Prisma)');
  } catch (error) {
    console.error('❌ Veritabanı bağlantı hatası:', error);
    // Veritabanı henüz hazır değilse sunucuyu tamamen düşürmeyelim, geliştirme aşamasında loglayalım
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  console.log('🔌 Veritabanı bağlantısı kapatıldı');
};

export default prisma;
