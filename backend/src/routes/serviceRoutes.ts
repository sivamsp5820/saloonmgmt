import { Router } from 'express';
import {
  getServices,
  createService,
  updateService,
  deleteService,
  createServiceSchema,
  updateServiceSchema,
} from '../controllers/serviceController';
import { validateSchema } from '../middleware/validation';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Everyone logged in can view services
router.get('/', authenticateToken, getServices);

// Only administrators can edit services
router.post('/', authenticateToken, requireAdmin, validateSchema(createServiceSchema), createService);
router.put('/:id', authenticateToken, requireAdmin, validateSchema(updateServiceSchema), updateService);
router.delete('/:id', authenticateToken, requireAdmin, deleteService);

export default router;
