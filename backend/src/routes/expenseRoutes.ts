import { Router } from 'express';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  createExpenseSchema,
  updateExpenseSchema,
} from '../controllers/expenseController';
import { validateSchema } from '../middleware/validation';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getExpenses);
router.post('/', authenticateToken, validateSchema(createExpenseSchema), createExpense);
router.put('/:id', authenticateToken, requireAdmin, validateSchema(updateExpenseSchema), updateExpense);
router.delete('/:id', authenticateToken, requireAdmin, deleteExpense);

export default router;
