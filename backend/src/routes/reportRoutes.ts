import { Router } from 'express';
import { getDashboardReport, getPaymentReport, sendDailyReport, exportShiftExcel } from '../controllers/reportController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticateToken, requireAdmin, getDashboardReport);
router.get('/payments', authenticateToken, requireAdmin, getPaymentReport);
router.get('/export-excel', authenticateToken, exportShiftExcel);
router.post('/send-daily', authenticateToken, sendDailyReport);

export default router;
