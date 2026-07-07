import { Router } from 'express';
import { getDashboardReport, getPaymentReport, sendDailyReport } from '../controllers/reportController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticateToken, requireAdmin, getDashboardReport);
router.get('/payments', authenticateToken, requireAdmin, getPaymentReport);
router.post('/send-daily', authenticateToken, sendDailyReport);

export default router;
