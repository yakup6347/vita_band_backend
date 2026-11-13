import pool from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/index.js';
import { toBool, toIsoUtc, toNum, toStringId } from '../utils/apiResponse.js';

export const formatContact = (row) => ({
  id: toStringId(row.id),
  user_id: toStringId(row.user_id),
  linked_user_id: toStringId(row.linked_user_id),
  full_name: row.full_name,
  phone_number: row.phone_number ?? null,
  priority: toNum(row.priority),
  is_active: toBool(row.is_active),
  phone_verified_at: toIsoUtc(row.phone_verified_at),
  created_at: toIsoUtc(row.created_at),
  updated_at: toIsoUtc(row.updated_at),
});

export class ContactService {
  static async listContacts(userId) {
    const [rows] = await pool.execute(
      `SELECT id, user_id, linked_user_id, full_name, phone_number, priority,
              is_active, phone_verified_at, created_at, updated_at
       FROM contacts
       WHERE user_id = ? AND is_active = TRUE
       ORDER BY priority ASC, id ASC`,
      [userId]
    );

    return {
      contacts: rows.map(formatContact),
    };
  }

  static async addContact(userId, body) {
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    if (!fullName || fullName.length > 150) {
      throw new AppError(
        'Geçerli bir full_name (1-150 karakter) zorunludur.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    let linkedUserId = null;
    if (body.linked_user_id !== null && body.linked_user_id !== undefined && body.linked_user_id !== '') {
      if (!/^\d+$/.test(String(body.linked_user_id))) {
        throw new AppError(
          'Geçersiz linked_user_id formatı.',
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      linkedUserId = String(body.linked_user_id);
      if (linkedUserId === String(userId)) {
        throw new AppError(
          'Kullanıcı kendisini acil durum kişisi olarak ekleyemez.',
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const [targetUsers] = await pool.execute(
        'SELECT id FROM users WHERE id = ? AND is_active = TRUE LIMIT 1',
        [linkedUserId]
      );
      if (targetUsers.length === 0) {
        throw new AppError(
          'Bağlanacak kullanıcı (linked_user_id) bulunamadı.',
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.NOT_FOUND
        );
      }
    }

    let phoneNumber = null;
    if (body.phone_number !== null && body.phone_number !== undefined) {
      const trimmedPhone = String(body.phone_number).trim();
      if (!trimmedPhone) {
        throw new AppError(
          'phone_number boş metin olamaz; göndermeyecekseniz null veriniz.',
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      if (trimmedPhone.length > 32) {
        throw new AppError(
          'phone_number en fazla 32 karakter olabilir.',
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      phoneNumber = trimmedPhone;
    }

    if (linkedUserId === null && phoneNumber === null) {
      throw new AppError(
        'linked_user_id veya phone_number alanlarından en az biri zorunludur.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const priority = body.priority === undefined || body.priority === null ? 1 : Number(body.priority);
    if (!Number.isInteger(priority) || priority <= 0) {
      throw new AppError(
        'priority 0\'dan büyük bir tam sayı olmalıdır.',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Aynı telefon veya linked_user_id varsa çakışma / yeniden aktifleştirme kontrolü
    if (linkedUserId !== null) {
      const [existingLinked] = await pool.execute(
        'SELECT id, is_active FROM contacts WHERE user_id = ? AND linked_user_id = ? LIMIT 1',
        [userId, linkedUserId]
      );
      if (existingLinked.length > 0) {
        if (Number(existingLinked[0].is_active) === 1) {
          throw new AppError(
            'Bu kullanıcı zaten acil durum kişisi olarak ekli.',
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.CONFLICT
          );
        }
        await pool.execute(
          `UPDATE contacts
           SET full_name = ?, phone_number = ?, priority = ?, is_active = TRUE
           WHERE id = ?`,
          [fullName, phoneNumber, priority, existingLinked[0].id]
        );
        const [updated] = await pool.execute('SELECT * FROM contacts WHERE id = ? LIMIT 1', [
          existingLinked[0].id,
        ]);
        return formatContact(updated[0]);
      }
    }

    if (phoneNumber !== null) {
      const [existingPhone] = await pool.execute(
        'SELECT id, is_active FROM contacts WHERE user_id = ? AND phone_number = ? LIMIT 1',
        [userId, phoneNumber]
      );
      if (existingPhone.length > 0) {
        if (Number(existingPhone[0].is_active) === 1) {
          throw new AppError(
            'Bu telefon numarası zaten acil durum kişisi olarak ekli.',
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.CONFLICT
          );
        }
        await pool.execute(
          `UPDATE contacts
           SET linked_user_id = ?, full_name = ?, priority = ?, is_active = TRUE
           WHERE id = ?`,
          [linkedUserId, fullName, priority, existingPhone[0].id]
        );
        const [updated] = await pool.execute('SELECT * FROM contacts WHERE id = ? LIMIT 1', [
          existingPhone[0].id,
        ]);
        return formatContact(updated[0]);
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO contacts (user_id, linked_user_id, full_name, phone_number, priority, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [userId, linkedUserId, fullName, phoneNumber, priority]
    );

    const [created] = await pool.execute('SELECT * FROM contacts WHERE id = ? LIMIT 1', [
      result.insertId,
    ]);
    return formatContact(created[0]);
  }

  static async deactivateContact(userId, contactId) {
    if (!/^\d+$/.test(String(contactId || ''))) {
      throw new AppError(
        'Geçersiz kişi kimliği.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.BAD_REQUEST
      );
    }

    const [rows] = await pool.execute(
      'SELECT id, user_id, is_active, created_at, updated_at FROM contacts WHERE id = ? LIMIT 1',
      [contactId]
    );

    if (rows.length === 0) {
      throw new AppError(
        'Acil durum kişisi bulunamadı.',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND
      );
    }

    if (String(rows[0].user_id) !== String(userId)) {
      throw new AppError(
        'Bu acil durum kişisini silme yetkiniz bulunmuyor.',
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.FORBIDDEN
      );
    }

    await pool.execute('UPDATE contacts SET is_active = FALSE WHERE id = ?', [contactId]);

    const [updated] = await pool.execute(
      'SELECT id, is_active, created_at, updated_at FROM contacts WHERE id = ? LIMIT 1',
      [contactId]
    );

    const row = updated[0];
    return {
      id: toStringId(row.id),
      is_active: toBool(row.is_active),
      created_at: toIsoUtc(row.created_at),
      updated_at: toIsoUtc(row.updated_at),
    };
  }
}
