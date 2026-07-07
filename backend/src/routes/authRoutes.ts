import { Router } from 'express';
import { login, getMe, loginSchema } from '../controllers/authController';
import { validateSchema } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', validateSchema(loginSchema), login);
router.get('/me', authenticateToken, getMe);

export default router;
