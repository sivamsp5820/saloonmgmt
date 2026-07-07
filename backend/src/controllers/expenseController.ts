import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db';
import { logger } from '../config/logger';

export const createExpenseSchema = z.object({
  body: z.object({
    description: z.string().min(1, 'Description is required'),
    category: z.enum(['Product Purchase', 'Utilities', 'Maintenance', 'Salary', 'Rent', 'Marketing', 'Other']),
    amount: z.number().positive('Amount must be greater than zero'),
    payment_mode: z.enum(['Cash', 'UPI', 'Card', 'Net Banking']),
    note: z.string().optional(),
  }),
});

export const updateExpenseSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid expense ID format'),
  }),
  body: z.object({
    description: z.string().min(1, 'Description is required').optional(),
    amount: z.number().positive('Amount must be greater than zero').optional(),
    category: z.enum(['Product Purchase', 'Utilities', 'Maintenance', 'Salary', 'Rent', 'Marketing', 'Other']).optional(),
    payment_mode: z.enum(['Cash', 'UPI', 'Card', 'Net Banking']).optional(),
    note: z.string().optional(),
  }),
});

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { period, user, category } = req.query;

    let queryText = `
      SELECT 
        e.id,
        e.description,
        e.category,
        e.amount::float as amount,
        e.payment_mode,
        e.note,
        e.created_at,
        e.recorded_by,
        p.name as "recordedByName"
      FROM expenses e
      LEFT JOIN profiles p ON e.recorded_by = p.id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    const now = new Date();

    if (period === 'day') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      queryParams.push(startOfDay);
      queryText += ` AND e.created_at >= $${queryParams.length}`;
    } else if (period === 'week') {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
      queryParams.push(startOfWeek);
      queryText += ` AND e.created_at >= $${queryParams.length}`;
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      queryParams.push(startOfMonth);
      queryText += ` AND e.created_at >= $${queryParams.length}`;
    } else if (period === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      queryParams.push(startOfYear);
      queryText += ` AND e.created_at >= $${queryParams.length}`;
    }

    if (user && user !== 'all') {
      queryParams.push(user);
      queryText += ` AND p.username = $${queryParams.length}`;
    }

    if (category && category !== 'all') {
      queryParams.push(category);
      queryText += ` AND e.category = $${queryParams.length}`;
    }

    queryText += ` ORDER BY e.created_at DESC`;

    const result = await pool.query(queryText, queryParams);

    const formattedExpenses = result.rows.map((row) => ({
      id: row.id,
      description: row.description,
      category: row.category,
      amount: row.amount,
      payment_mode: row.payment_mode,
      note: row.note,
      created_at: row.created_at,
      recorded_by: row.recorded_by,
      recordedByName: row.recordedByName || 'Unknown',
    }));

    return res.json({ status: 'success', data: formattedExpenses });
  } catch (err: any) {
    logger.error(`Error in getExpenses: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve expenses.' });
  }
};

export const createExpense = async (req: Request, res: Response) => {
  try {
    const { description, category, amount, payment_mode, note } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized.' });
    }

    const result = await pool.query(
      `INSERT INTO expenses (description, category, amount, payment_mode, note, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, description, category, amount::float as amount, payment_mode, note, recorded_by, created_at`,
      [description, category, amount, payment_mode, note, userId]
    );
    const expense = result.rows[0];

    logger.info(`Expense recorded: ₹${amount} - ${description} by user ${req.user?.username}`);
    return res.status(201).json({ status: 'success', data: expense });
  } catch (err: any) {
    logger.error(`Error in createExpense: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to log expense.' });
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, amount, category, payment_mode, note } = req.body;

    const result = await pool.query(
      `UPDATE expenses 
       SET description = COALESCE($1, description),
           amount = COALESCE($2, amount),
           category = COALESCE($3, category),
           payment_mode = COALESCE($4, payment_mode),
           note = COALESCE($5, note)
       WHERE id = $6 
       RETURNING id, description, category, amount::float as amount, payment_mode, note, recorded_by, created_at`,
      [description !== undefined ? description : null, 
       amount !== undefined ? amount : null, 
       category !== undefined ? category : null, 
       payment_mode !== undefined ? payment_mode : null, 
       note !== undefined ? note : null, 
       id]
    );

    const expense = result.rows[0];
    if (!expense) {
      return res.status(404).json({ status: 'error', message: 'Expense not found.' });
    }

    logger.info(`Expense updated: ${id} by user ${req.user?.username}`);
    return res.json({ status: 'success', data: expense });
  } catch (err: any) {
    logger.error(`Error in updateExpense: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to update expense.' });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Expense not found.' });
    }

    logger.info(`Expense deleted: ${id} by user ${req.user?.username}`);
    return res.json({ status: 'success', message: 'Expense entry successfully deleted.' });
  } catch (err: any) {
    logger.error(`Error in deleteExpense: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to delete expense entry.' });
  }
};
