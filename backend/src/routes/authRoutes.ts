import { Router } from 'express';
import { 
  login, 
  getMe, 
  loginSchema,
  getProfiles,
  createProfile,
  createProfileSchema,
  updateProfile,
  updateProfileSchema,
  deleteProfile
} from '../controllers/authController';
import { validateSchema } from '../middleware/validation';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/login', validateSchema(loginSchema), login);
router.get('/me', authenticateToken, getMe);

// User/Profile management routes
router.get('/users', authenticateToken, requireAdmin, getProfiles);
router.post('/users', authenticateToken, requireAdmin, validateSchema(createProfileSchema), createProfile);
router.put('/users/:id', authenticateToken, requireAdmin, validateSchema(updateProfileSchema), updateProfile);
router.delete('/users/:id', authenticateToken, requireAdmin, deleteProfile);

export default router;
