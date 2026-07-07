import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db';
import { logger } from '../config/logger';

export const createTransactionSchema = z.object({
  body: z.object({
    customerName: z.string().min(1, 'Customer name is required'),
    customerPhone: z.string().optional(),
    services: z.array(z.object({
      id: z.string().uuid('Invalid service ID format'),
      price: z.number().nonnegative().optional(),
    })).min(1, 'At least one service is required'),
    discountType: z.enum(['percent', 'rupees']),
    discountValue: z.number().nonnegative(),
    discountAmount: z.number().nonnegative().optional(),
    subtotal: z.number().nonnegative().optional(),
    total: z.number().nonnegative().optional(),
    paymentMode: z.enum(['Cash', 'UPI', 'Card', 'Net Banking']),
  }),
});

export const updateTransactionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid transaction ID format'),
  }),
  body: z.object({
    customerName: z.string().min(1, 'Customer name is required').optional(),
    total: z.number().nonnegative().optional(),
    paymentMode: z.enum(['Cash', 'UPI', 'Card', 'Net Banking']).optional(),
  }),
});

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const { period, user, search } = req.query;

    let queryText = `
      SELECT 
        t.id,
        t.created_at,
        t.subtotal::float as subtotal,
        t.discount_type,
        t.discount_value::float as discount_value,
        t.discount_amount::float as discount_amount,
        t.total::float as total,
        t.payment_mode as "paymentMode",
        t.billed_by as "billedBy",
        c.id as "customerId",
        c.name as "customerName",
        c.phone as "customerPhone",
        p.name as "billedByName",
        COALESCE(
          json_agg(
            json_build_object(
              'price', ts.price::float,
              'services', json_build_object(
                'id', s.id,
                'name', s.name
              )
            )
          ) FILTER (WHERE ts.id IS NOT NULL),
          '[]'
        ) as transaction_services
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN profiles p ON t.billed_by = p.id
      LEFT JOIN transaction_services ts ON ts.transaction_id = t.id
      LEFT JOIN services s ON ts.service_id = s.id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    const now = new Date();

    if (period === 'day') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      queryParams.push(startOfDay);
      queryText += ` AND t.created_at >= $${queryParams.length}`;
    } else if (period === 'week') {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
      queryParams.push(startOfWeek);
      queryText += ` AND t.created_at >= $${queryParams.length}`;
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      queryParams.push(startOfMonth);
      queryText += ` AND t.created_at >= $${queryParams.length}`;
    } else if (period === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      queryParams.push(startOfYear);
      queryText += ` AND t.created_at >= $${queryParams.length}`;
    }

    if (user && user !== 'all') {
      queryParams.push(user);
      queryText += ` AND p.username = $${queryParams.length}`;
    }

    queryText += `
      GROUP BY t.id, c.id, p.id
      ORDER BY t.created_at DESC
    `;

    const result = await pool.query(queryText, queryParams);

    let formatted = result.rows.map((t: any) => {
      const services = t.transaction_services.map((ts: any) => ({
        id: ts.services?.id,
        name: ts.services?.name,
        price: ts.price,
      }));

      return {
        id: t.id,
        created_at: t.created_at,
        customerName: t.customerName || 'Guest',
        customerPhone: t.customerPhone || '—',
        customerId: t.customerId || null,
        subtotal: t.subtotal,
        discount_type: t.discount_type,
        discount_value: t.discount_value,
        discount_amount: t.discount_amount,
        total: t.total,
        paymentMode: t.paymentMode,
        billedBy: t.billedBy,
        billedByName: t.billedByName || 'Unknown',
        services,
      };
    });

    if (search) {
      const s = (search as string).toLowerCase();
      formatted = formatted.filter(
        (f) =>
          f.customerName.toLowerCase().includes(s) ||
          f.customerPhone.includes(s) ||
          f.services.some((svc: { name: string }) => svc.name.toLowerCase().includes(s))
      );
    }

    return res.json({ status: 'success', data: formatted });
  } catch (err: any) {
    logger.error(`Error in getTransactions: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve transactions.' });
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      customerName,
      customerPhone,
      services,
      discountType,
      discountValue,
      paymentMode,
    } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized.' });
    }

    await client.query('BEGIN');

    // 1. Fetch all requested services from the database to get their true price
    const serviceIds = services.map((s: any) => s.id);
    const dbServicesRes = await client.query(
      'SELECT id, name, price FROM services WHERE id = ANY($1::uuid[])',
      [serviceIds]
    );

    const dbServicesMap = new Map<string, { name: string; price: number }>();
    dbServicesRes.rows.forEach((row: any) => {
      dbServicesMap.set(row.id, { name: row.name, price: parseFloat(row.price) });
    });

    // Verify all requested services exist in the database
    for (const s of services) {
      if (!dbServicesMap.has(s.id)) {
        throw new Error(`Service with ID ${s.id} not found in database.`);
      }
    }

    // 2. Compute correct pricing values dynamically from DB prices
    let calculatedSubtotal = 0;
    const itemsToInsert: { id: string; name: string; price: number }[] = [];

    for (const s of services) {
      const dbSvc = dbServicesMap.get(s.id)!;
      calculatedSubtotal += dbSvc.price;
      itemsToInsert.push({ id: s.id, name: dbSvc.name, price: dbSvc.price });
    }

    let calculatedDiscountAmount = 0;
    if (discountType === 'percent') {
      calculatedDiscountAmount = Math.round(calculatedSubtotal * (discountValue / 100));
    } else {
      calculatedDiscountAmount = discountValue;
    }

    const calculatedTotal = Math.max(0, calculatedSubtotal - calculatedDiscountAmount);

    // 3. Manage Customer registration
    let customerId: string | null = null;
    if (customerPhone) {
      // Find customer by phone
      const existingCustRes = await client.query(
        'SELECT id FROM customers WHERE phone = $1 LIMIT 1',
        [customerPhone]
      );

      if (existingCustRes.rows.length > 0) {
        customerId = existingCustRes.rows[0].id;
      } else {
        // Create new customer
        const newCustRes = await client.query(
          'INSERT INTO customers (name, phone) VALUES ($1, $2) RETURNING id',
          [customerName, customerPhone]
        );
        customerId = newCustRes.rows[0].id;
      }
    } else {
      // Missing phone: create guest customer profile
      const newCustRes = await client.query(
        'INSERT INTO customers (name) VALUES ($1) RETURNING id',
        [customerName]
      );
      customerId = newCustRes.rows[0].id;
    }

    // 4. Insert Transaction Header with backend-calculated prices
    const txRes = await client.query(
      `INSERT INTO transactions (customer_id, subtotal, discount_type, discount_value, discount_amount, total, payment_mode, billed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, created_at`,
      [customerId, calculatedSubtotal, discountType, discountValue, calculatedDiscountAmount, calculatedTotal, paymentMode, userId]
    );
    const transaction = txRes.rows[0];

    // 5. Insert Transaction Services list
    for (const item of itemsToInsert) {
      await client.query(
        'INSERT INTO transaction_services (transaction_id, service_id, price) VALUES ($1, $2, $3)',
        [transaction.id, item.id, item.price]
      );
    }

    await client.query('COMMIT');

    logger.info(`Transaction saved: ID ${transaction.id} for customer ${customerName}`);

    return res.status(201).json({
      status: 'success',
      data: {
        id: transaction.id,
        ts: transaction.created_at,
        custName: customerName,
        custPhone: customerPhone || '',
        services: itemsToInsert,
        discountType,
        discountVal: discountValue,
        discount: calculatedDiscountAmount,
        subtotal: calculatedSubtotal,
        total: calculatedTotal,
        paymentMode,
        billedByName: req.user?.name,
      },
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error(`Error in createTransaction: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to process transaction.' });
  } finally {
    client.release();
  }
};

export const updateTransaction = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { customerName, total, paymentMode } = req.body;

    await client.query('BEGIN');

    // 1. If customerName is updated, we need to update customer linked to transaction
    if (customerName) {
      const txRes = await client.query('SELECT customer_id FROM transactions WHERE id = $1', [id]);
      
      if (txRes.rows.length > 0 && txRes.rows[0].customer_id) {
        await client.query(
          'UPDATE customers SET name = $1 WHERE id = $2',
          [customerName, txRes.rows[0].customer_id]
        );
      }
    }

    // 2. Update transaction
    const updatePayload: any = {};
    if (total !== undefined) updatePayload.total = total;
    if (paymentMode !== undefined) updatePayload.payment_mode = paymentMode;

    let transaction = null;
    if (Object.keys(updatePayload).length > 0) {
      const fields = Object.keys(updatePayload);
      const setClauses = fields.map((field, index) => `"${field}" = $${index + 1}`).join(', ');
      const values = fields.map(field => updatePayload[field]);
      values.push(id);

      const txUpdateRes = await client.query(
        `UPDATE transactions 
         SET ${setClauses} 
         WHERE id = $${values.length} 
         RETURNING *`,
        values
      );
      transaction = txUpdateRes.rows[0];
    } else {
      const txRes = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
      transaction = txRes.rows[0];
    }

    await client.query('COMMIT');

    logger.info(`Transaction updated: ${id} by user ${req.user?.username}`);
    return res.json({ status: 'success', data: transaction });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error(`Error in updateTransaction: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to update transaction.' });
  } finally {
    client.release();
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM transactions WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Transaction not found.' });
    }

    logger.info(`Transaction deleted: ${id} by user ${req.user?.username}`);
    return res.json({ status: 'success', message: 'Transaction entry successfully deleted.' });
  } catch (err: any) {
    logger.error(`Error in deleteTransaction: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to delete transaction.' });
  }
};
