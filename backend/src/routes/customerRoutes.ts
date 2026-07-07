import { Router } from 'express';
import {
  getCustomers,
  getCustomerHistory,
  updateCustomer,
  deleteCustomer,
  updateCustomerSchema,
} from '../controllers/customerController';
import { validateSchema } from '../middleware/validation';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getCustomers);
router.get('/:id/history', authenticateToken, getCustomerHistory);
router.put('/:id', authenticateToken, validateSchema(updateCustomerSchema), updateCustomer);
router.delete('/:id', authenticateToken, requireAdmin, deleteCustomer);

export default router;
