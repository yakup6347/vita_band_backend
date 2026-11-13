import { Router } from 'express';
import { AccessController } from '../controllers/access.controller.js';
import { PushTokenController } from '../controllers/pushToken.controller.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateUser);
router.get('/access', AccessController.listMyAccess);
router.post('/push-tokens', PushTokenController.register);
router.delete('/push-tokens/:id', PushTokenController.deactivate);

export default router;
