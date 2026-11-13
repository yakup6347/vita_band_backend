import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateUser);
router.put('/:id/read', NotificationController.markAsRead);

export default router;
