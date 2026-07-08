import { Router } from 'express';
import { resetDatabase } from '../controllers/systemController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Endpoint for clearing tables, restricted to administrators only
router.post('/reset', authenticateToken, requireAdmin, resetDatabase);

export default router;
