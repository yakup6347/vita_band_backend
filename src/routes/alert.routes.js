import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', AlertController.createAlert);
router.get('/', AlertController.getMyAlerts);
router.patch('/:id/resolve', AlertController.resolveAlert);

export default router;
