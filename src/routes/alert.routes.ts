import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createAlertSchema } from '../validators/alert.validator';

const router = Router();

router.use(authenticate);

// Manuel acil durum/alarm oluşturma (Panik butonu vb.)
router.post('/', validate(createAlertSchema), AlertController.createAlert);

// Kullanıcının uyarılarını listeleme
router.get('/', AlertController.getMyAlerts);

// Uyarıyı çözüldü yapma
router.patch('/:id/resolve', AlertController.resolveAlert);

export default router;
