import { Router } from 'express';
import { getEmailSettings, updateEmailSettings, sendManualReportEmail } from '../controllers/emailSettingsController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireAdmin, getEmailSettings);
router.put('/', authenticateToken, requireAdmin, updateEmailSettings);
router.post('/', authenticateToken, requireAdmin, updateEmailSettings);
router.post('/send-manual', authenticateToken, requireAdmin, sendManualReportEmail);

export default router;
