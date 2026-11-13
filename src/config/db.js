import mysql from 'mysql2/promise';
import { env } from './env.js';

// MySQL Bağlantı Havuzu (UTC zorunlu, BIGINT/DECIMAL uyumlu)
export const pool = mysql.createPool({
  host: env.DB.host,
  port: env.DB.port,
  user: env.DB.user,
  password: env.DB.password,
  database: env.DB.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  decimalNumbers: true,
  supportBigNumbers: true,
  bigNumberStrings: true,
});

// Her yeni fiziksel bağlantıda oturum saat dilimini UTC olarak sabitle
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

// Veritabanı bağlantı testi
export const testDatabaseConnection = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.query("SET time_zone = '+00:00'");
    console.log(
      `✅ MySQL veritabanına bağlanıldı [${env.DB.database} @ ${env.DB.host}:${env.DB.port}]`
    );
    connection.release();
    return true;
  } catch (error) {
    console.error(`❌ MySQL bağlantı hatası: ${error.message}`);
    return false;
  }
};

export default pool;
