import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db';
import { logger } from '../config/logger';

// Zod schemas for service validations
export const createServiceSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Service name is required'),
    category: z.string().min(1, 'Category is required'),
    price: z.number().min(0, 'Price must be a positive number'),
    duration: z.number().min(1, 'Duration must be at least 1 minute').optional(),
    description: z.string().optional(),
  }),
});

export const updateServiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid service ID format'),
  }),
  body: z.object({
    name: z.string().min(1, 'Service name is required').optional(),
    category: z.string().min(1, 'Category is required').optional(),
    price: z.number().min(0, 'Price must be a positive number').optional(),
    duration: z.number().min(1, 'Duration must be at least 1 minute').optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  }),
});

export const getServices = async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;

    let queryText = 'SELECT id, name, category, price::float as price, duration, description, is_active, created_at FROM services WHERE is_active = true';
    const queryParams: any[] = [];

    if (category) {
      queryParams.push(category);
      queryText += ` AND category = $${queryParams.length}`;
    }

    if (search) {
      queryParams.push(`%${search}%`);
      queryText += ` AND name ILIKE $${queryParams.length}`;
    }

    queryText += ' ORDER BY name ASC';

    const result = await pool.query(queryText, queryParams);

    return res.json({ status: 'success', data: result.rows });
  } catch (err: any) {
    logger.error(`Error in getServices: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve services.' });
  }
};

export const createService = async (req: Request, res: Response) => {
  try {
    const { name, category, price, duration, description } = req.body;

    const result = await pool.query(
      `INSERT INTO services (name, category, price, duration, description) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, category, price::float as price, duration, description, is_active, created_at`,
      [name, category, price, duration || 30, description]
    );

    const service = result.rows[0];

    logger.info(`Service created: ${name} by user ${req.user?.username}`);
    return res.status(201).json({ status: 'success', data: service });
  } catch (err: any) {
    logger.error(`Error in createService: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to create service.' });
  }
};

export const updateService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const fields = Object.keys(updateData);
    if (fields.length === 0) {
      const currentRes = await pool.query('SELECT id, name, category, price::float as price, duration, description, is_active, created_at FROM services WHERE id = $1', [id]);
      return res.json({ status: 'success', data: currentRes.rows[0] });
    }

    const setClauses = fields.map((field, index) => `"${field}" = $${index + 1}`).join(', ');
    const values = fields.map(field => updateData[field]);
    values.push(id);

    const queryText = `
      UPDATE services 
      SET ${setClauses} 
      WHERE id = $${values.length} 
      RETURNING id, name, category, price::float as price, duration, description, is_active, created_at
    `;
    const result = await pool.query(queryText, values);
    const service = result.rows[0];

    if (!service) {
      return res.status(404).json({ status: 'error', message: 'Service not found.' });
    }

    logger.info(`Service updated: ${id} by user ${req.user?.username}`);
    return res.json({ status: 'success', data: service });
  } catch (err: any) {
    logger.error(`Error in updateService: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to update service.' });
  }
};

export const deleteService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Use soft delete (is_active = false) to prevent breaking foreign keys on transaction logs
    const result = await pool.query(
      `UPDATE services 
       SET is_active = false 
       WHERE id = $1 
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Service not found.' });
    }

    logger.info(`Service soft-deleted: ${id} by user ${req.user?.username}`);
    return res.json({ status: 'success', message: 'Service successfully deactivated.' });
  } catch (err: any) {
    logger.error(`Error in deleteService: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to delete service.' });
  }
};

// Zod schemas for service category validations
export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Category name is required').max(50, 'Category name is too long'),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid category ID format'),
  }),
  body: z.object({
    name: z.string().min(1, 'Category name is required').max(50, 'Category name is too long'),
  }),
});

// Category handlers
export const getCategories = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name, created_at FROM service_categories ORDER BY name ASC');
    return res.json({ status: 'success', data: result.rows });
  } catch (err: any) {
    logger.error(`Error in getCategories: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve categories.' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const checkRes = await pool.query('SELECT id FROM service_categories WHERE name = $1', [name]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Category already exists.' });
    }

    const result = await pool.query(
      'INSERT INTO service_categories (name) VALUES ($1) RETURNING id, name, created_at',
      [name]
    );
    logger.info(`Category created: ${name} by user ${req.user?.username}`);
    return res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err: any) {
    logger.error(`Error in createCategory: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to create category.' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const categoryRes = await pool.query('SELECT name FROM service_categories WHERE id = $1', [id]);
    if (categoryRes.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Category not found.' });
    }
    const oldName = categoryRes.rows[0].name;

    if (oldName !== name) {
      const checkRes = await pool.query('SELECT id FROM service_categories WHERE name = $1', [name]);
      if (checkRes.rows.length > 0) {
        return res.status(400).json({ status: 'error', message: 'Category name already exists.' });
      }
    }

    const result = await pool.query(
      'UPDATE service_categories SET name = $1 WHERE id = $2 RETURNING id, name, created_at',
      [name, id]
    );

    logger.info(`Category updated: ${oldName} -> ${name} by user ${req.user?.username}`);
    return res.json({ status: 'success', data: result.rows[0] });
  } catch (err: any) {
    logger.error(`Error in updateCategory: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to update category.' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const reassignTo = req.query.reassignTo as string | undefined;
    const confirm = req.query.confirm === 'true';

    await client.query('BEGIN');

    const categoryRes = await client.query('SELECT name FROM service_categories WHERE id = $1', [id]);
    if (categoryRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Category not found.' });
    }
    const categoryName = categoryRes.rows[0].name;

    if (categoryName.toLowerCase() === 'uncategorized') {
      await client.query('ROLLBACK');
      return res.status(400).json({ status: 'error', message: 'Cannot delete the default Uncategorized category.' });
    }

    const servicesRes = await client.query('SELECT COUNT(*) FROM services WHERE category = $1 AND is_active = true', [categoryName]);
    const serviceCount = parseInt(servicesRes.rows[0].count, 10);

    if (serviceCount > 0) {
      if (!reassignTo && !confirm) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          status: 'error',
          code: 'CATEGORY_IN_USE',
          message: `Category is currently assigned to ${serviceCount} services.`,
          serviceCount
        });
      }

      if (reassignTo) {
        const targetCheck = await client.query('SELECT name FROM service_categories WHERE name = $1', [reassignTo]);
        if (targetCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ status: 'error', message: 'Target reassignment category does not exist.' });
        }
        await client.query('UPDATE services SET category = $1 WHERE category = $2', [reassignTo, categoryName]);
      } else if (confirm) {
        await client.query("INSERT INTO service_categories (name) VALUES ('Uncategorized') ON CONFLICT (name) DO NOTHING");
        await client.query("UPDATE services SET category = 'Uncategorized' WHERE category = $1", [categoryName]);
      }
    }

    await client.query('DELETE FROM service_categories WHERE id = $1', [id]);
    await client.query('COMMIT');

    logger.info(`Category deleted: ${categoryName} by user ${req.user?.username}`);
    return res.json({ status: 'success', message: 'Category successfully deleted.' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error(`Error in deleteCategory: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to delete category.' });
  } finally {
    client.release();
  }
};
