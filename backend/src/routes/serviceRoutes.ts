import { Router } from 'express';
import {
  getServices,
  createService,
  updateService,
  deleteService,
  createServiceSchema,
  updateServiceSchema,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createCategorySchema,
  updateCategorySchema,
} from '../controllers/serviceController';
import { validateSchema } from '../middleware/validation';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const requireAdminOrBilling = requireRole(['admin', 'billing']);

// Service category routes
router.get('/categories', authenticateToken, getCategories);
router.post('/categories', authenticateToken, requireAdminOrBilling, validateSchema(createCategorySchema), createCategory);
router.put('/categories/:id', authenticateToken, requireAdminOrBilling, validateSchema(updateCategorySchema), updateCategory);
router.delete('/categories/:id', authenticateToken, requireAdminOrBilling, deleteCategory);

// Service routes
router.get('/', authenticateToken, getServices);
router.post('/', authenticateToken, requireAdminOrBilling, validateSchema(createServiceSchema), createService);
router.put('/:id', authenticateToken, requireAdminOrBilling, validateSchema(updateServiceSchema), updateService);
router.delete('/:id', authenticateToken, requireAdminOrBilling, deleteService);

export default router;
