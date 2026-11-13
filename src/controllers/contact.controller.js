import { ContactService } from '../services/contact.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export class ContactController {
  static async list(req, res, next) {
    try {
      const data = await ContactService.listContacts(req.params.id);
      return sendSuccess(res, data, 'Acil durum kişileri getirildi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }

  static async add(req, res, next) {
    try {
      const data = await ContactService.addContact(req.params.id, req.body || {});
      return sendSuccess(res, data, 'Acil durum kişisi eklendi.', HTTP_STATUS.CREATED);
    } catch (error) {
      return next(error);
    }
  }

  static async deactivate(req, res, next) {
    try {
      const data = await ContactService.deactivateContact(req.params.id, req.params.contactId);
      return sendSuccess(res, data, 'Acil durum kişisi pasifleştirildi.', HTTP_STATUS.OK);
    } catch (error) {
      return next(error);
    }
  }
}
