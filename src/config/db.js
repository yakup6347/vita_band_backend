import mysql from 'mysql2/promise';
import { env } from './env.js';

// MySQL Bağlantı Havuzu (Connection Pool)
export const pool = mysql.createPool({
  host: env.DB.host,
  port: env.DB.port,
  user: env.DB.user,
  password: env.DB.password,
  database: env.DB.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Veritabanı bağlantı testi
export const testDatabaseConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ MySQL Veritabanına başarıyla bağlanıldı! [${env.DB.database} @ ${env.DB.host}:${env.DB.port}]`);
    connection.release();
    return true;
  } catch (error) {
    console.warn(`⚠️ MySQL Bağlantı uyarısı: ${error.message}`);
    console.warn(`👉 MySQL henüz çalışmıyor veya veritabanı '${env.DB.database}' henüz oluşturulmamış olabilir.`);
    console.warn(`👉 Ekip arkadaşınız veritabanını hazırladığında .env dosyasındaki DB_* ayarlarını güncelleyebilirsiniz.`);
    return false;
  }
};

export default pool;
