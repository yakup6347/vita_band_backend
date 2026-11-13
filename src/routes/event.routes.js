import { Router } from 'express';
import { EventController } from '../controllers/event.controller.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateUser);
router.put('/:id', EventController.updateEvent);

export default router;
