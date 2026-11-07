import pool from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { HTTP_STATUS } from '../constants/index.js';

export class UserService {
  // Kullanıcı profili ve bağlı cihazları getir
  static async getProfile(userId) {
    const [users] = await pool.execute(
      `SELECT id, email, name, phone, emergency_contact, birth_date, gender, blood_type, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      throw new AppError('Kullanıcı bulunamadı', HTTP_STATUS.NOT_FOUND);
    }

    const user = users[0];

    // Bağlı cihazları al
    const [devices] = await pool.execute(
      `SELECT id, mac_address, device_name, battery_level, is_online, last_sync_at 
       FROM devices WHERE user_id = ?`,
      [userId]
    );

    return {
      ...user,
      devices,
    };
  }

  // Profil bilgilerini güncelle
  static async updateProfile(userId, { name, phone, emergencyContact, birthDate, gender, bloodType }) {
    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (emergencyContact) {
      updates.push('emergency_contact = ?');
      values.push(emergencyContact);
    }
    if (birthDate) {
      updates.push('birth_date = ?');
      values.push(birthDate);
    }
    if (gender) {
      updates.push('gender = ?');
      values.push(gender);
    }
    if (bloodType) {
      updates.push('blood_type = ?');
      values.push(bloodType);
    }

    if (updates.length > 0) {
      values.push(userId);
      await pool.execute(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    return this.getProfile(userId);
  }
}
