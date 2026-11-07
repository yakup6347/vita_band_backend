import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/profile', UserController.getProfile);
router.patch('/profile', UserController.updateProfile);

export default router;
