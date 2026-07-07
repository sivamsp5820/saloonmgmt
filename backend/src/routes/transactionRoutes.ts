import { Router } from 'express';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createTransactionSchema,
  updateTransactionSchema,
} from '../controllers/transactionController';
import { validateSchema } from '../middleware/validation';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getTransactions);
router.post('/', authenticateToken, validateSchema(createTransactionSchema), createTransaction);
router.put('/:id', authenticateToken, requireAdmin, validateSchema(updateTransactionSchema), updateTransaction);
router.delete('/:id', authenticateToken, requireAdmin, deleteTransaction);

export default router;
