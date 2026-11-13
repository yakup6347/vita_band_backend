import { Router } from 'express';
import { AccessController } from '../controllers/access.controller.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateUser);
router.put('/:id', AccessController.respondToAccess);
router.delete('/:id', AccessController.revokeAccess);

export default router;
