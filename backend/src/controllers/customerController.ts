import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db';
import { logger } from '../config/logger';

export const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid customer ID format'),
  }),
  body: z.object({
    name: z.string().min(1, 'Name is required').optional(),
    phone: z.string().optional(),
  }),
});

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    let queryText = `
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.created_at,
        COUNT(t.id)::int as visits,
        COALESCE(SUM(t.total), 0)::float as "totalSpent",
        MAX(t.created_at) as "lastVisit"
      FROM customers c
      LEFT JOIN transactions t ON t.customer_id = c.id
    `;
    
    const queryParams: any[] = [];
    if (search) {
      queryParams.push(`%${search}%`);
      queryText += ` WHERE c.name ILIKE $1 OR c.phone ILIKE $1`;
    }

    queryText += `
      GROUP BY c.id, c.name, c.phone, c.created_at
      ORDER BY "totalSpent" DESC, c.name ASC
    `;

    const result = await pool.query(queryText, queryParams);

    const customerStats = result.rows.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || '—',
      created_at: c.created_at,
      visits: c.visits,
      totalSpent: c.totalSpent,
      lastVisit: c.lastVisit,
    }));

    return res.json({ status: 'success', data: customerStats });
  } catch (err: any) {
    logger.error(`Error in getCustomers: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve customers.' });
  }
};

export const getCustomerHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Retrieve the customer details
    const customerRes = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (customerRes.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Customer not found.' });
    }
    const customer = customerRes.rows[0];

    // 2. Query transactions for the customer, joining services
    const txQuery = `
      SELECT 
        t.id,
        t.created_at,
        t.subtotal::float as subtotal,
        t.discount_type,
        t.discount_value::float as discount_value,
        t.discount_amount::float as discount_amount,
        t.total::float as total,
        t.payment_mode,
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
      LEFT JOIN transaction_services ts ON ts.transaction_id = t.id
      LEFT JOIN services s ON ts.service_id = s.id
      WHERE t.customer_id = $1
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    const txRes = await pool.query(txQuery, [id]);

    // 3. Format structural output
    const history = txRes.rows.map((t) => {
      const services = (t.transaction_services || []).map((ts: any) => ({
        id: ts.services?.id,
        name: ts.services?.name,
        price: ts.price,
      }));

      return {
        id: t.id,
        created_at: t.created_at,
        subtotal: t.subtotal,
        discount_type: t.discount_type,
        discount_value: t.discount_value,
        discount_amount: t.discount_amount,
        total: t.total,
        payment_mode: t.payment_mode,
        services,
      };
    });

    return res.json({
      status: 'success',
      data: {
        customer,
        history,
      },
    });
  } catch (err: any) {
    logger.error(`Error in getCustomerHistory: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve customer history.' });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    const result = await pool.query(
      `UPDATE customers 
       SET name = $1, phone = $2 
       WHERE id = $3 
       RETURNING *`,
      [name, phone || null, id]
    );
    const customer = result.rows[0];

    if (!customer) {
      return res.status(404).json({ status: 'error', message: 'Customer not found.' });
    }

    logger.info(`Customer updated: ${customer.name} (${id})`);
    return res.json({ status: 'success', data: customer });
  } catch (err: any) {
    logger.error(`Error in updateCustomer: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to update customer details.' });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Delete customer (will set customer_id to null in transactions via CASCADE/SET NULL configuration)
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Customer not found.' });
    }

    logger.info(`Customer deleted: ${id}`);
    return res.json({ status: 'success', message: 'Customer database entry deleted.' });
  } catch (err: any) {
    logger.error(`Error in deleteCustomer: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to delete customer.' });
  }
};
