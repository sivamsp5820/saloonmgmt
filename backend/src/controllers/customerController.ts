import { Request, Response } from 'express';
import { z } from 'zod';
import ExcelJS from 'exceljs';
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

    // 2. Query transactions for the customer, joining services and profiles
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
        t.billed_by,
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
      LEFT JOIN profiles p ON t.billed_by = p.id
      LEFT JOIN transaction_services ts ON ts.transaction_id = t.id
      LEFT JOIN services s ON ts.service_id = s.id
      WHERE t.customer_id = $1
      GROUP BY t.id, p.id
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
        payment_mode: t.payment_mode === 'UPI' ? 'Card' : t.payment_mode,
        billedBy: t.billed_by,
        billedByName: t.billedByName || 'Unknown',
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

export const exportCustomersExcel = async (req: Request, res: Response) => {
  try {
    // 1. Query all customer details with aggregated stats
    const customerQuery = `
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
      GROUP BY c.id, c.name, c.phone, c.created_at
      ORDER BY "totalSpent" DESC, c.name ASC
    `;
    const customerRes = await pool.query(customerQuery);
    const customers = customerRes.rows;

    // 2. Query itemized transactions with services
    const txQuery = `
      SELECT 
        c.name as "customerName",
        c.phone as "customerPhone",
        t.id as "transactionId",
        t.created_at as "createdAt",
        t.total::float as "total",
        t.payment_mode as "paymentMode",
        u.username as "billedBy",
        COALESCE(
          string_agg(s.name, ', '), 'N/A'
        ) as "servicesList"
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN transaction_services ts ON ts.transaction_id = t.id
      LEFT JOIN services s ON ts.service_id = s.id
      GROUP BY t.id, c.name, c.phone, u.username
      ORDER BY t.created_at DESC
    `;
    const txRes = await pool.query(txQuery);
    const transactions = txRes.rows;

    // 3. Build ExcelJS Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CreoCorp Billing System';
    workbook.created = new Date();

    // ── SHEET 1: Customer Directory & Overview ──
    const summarySheet = workbook.addWorksheet('Customer Roster');
    summarySheet.columns = [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Customer Name', key: 'name', width: 25 },
      { header: 'Phone Number', key: 'phone', width: 18 },
      { header: 'Visits Count', key: 'visits', width: 14 },
      { header: 'Total Spend (₹)', key: 'totalSpent', width: 18 },
      { header: 'Registration Date', key: 'createdAt', width: 22 },
      { header: 'Last Visit Date', key: 'lastVisit', width: 22 },
    ];

    customers.forEach((c, index) => {
      summarySheet.addRow({
        sno: index + 1,
        name: c.name,
        phone: c.phone || 'N/A',
        visits: c.visits,
        totalSpent: parseFloat((c.totalSpent || 0).toFixed(2)),
        createdAt: c.created_at ? new Date(c.created_at).toLocaleString('en-IN') : 'N/A',
        lastVisit: c.lastVisit ? new Date(c.lastVisit).toLocaleString('en-IN') : 'No visits yet',
      });
    });

    const headerRow1 = summarySheet.getRow(1);
    headerRow1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF111820' },
    };

    // ── SHEET 2: Complete Treatment & Transaction History ──
    const detailSheet = workbook.addWorksheet('Treatment History Log');
    detailSheet.columns = [
      { header: 'Date & Time', key: 'createdAt', width: 22 },
      { header: 'Customer Name', key: 'customerName', width: 25 },
      { header: 'Phone Number', key: 'customerPhone', width: 18 },
      { header: 'Services Rendered', key: 'servicesList', width: 35 },
      { header: 'Payment Mode', key: 'paymentMode', width: 16 },
      { header: 'Billed By', key: 'billedBy', width: 16 },
      { header: 'Total Amount (₹)', key: 'total', width: 18 },
    ];

    transactions.forEach((t) => {
      detailSheet.addRow({
        createdAt: new Date(t.createdAt).toLocaleString('en-IN'),
        customerName: t.customerName || 'Guest',
        customerPhone: t.customerPhone || 'N/A',
        servicesList: t.servicesList,
        paymentMode: (t.paymentMode || 'cash').toUpperCase(),
        billedBy: t.billedBy || 'System',
        total: parseFloat((t.total || 0).toFixed(2)),
      });
    });

    const headerRow2 = detailSheet.getRow(1);
    headerRow2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF161E28' },
    };

    // ── SHEET 3: Executive Summary ──
    const metaSheet = workbook.addWorksheet('Executive Summary');
    metaSheet.columns = [
      { header: 'Metric Title', key: 'metric', width: 30 },
      { header: 'Details / Count', key: 'value', width: 35 },
    ];

    const totalRevenueAll = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const totalVisitsAll = customers.reduce((sum, c) => sum + (c.visits || 0), 0);

    metaSheet.addRows([
      { metric: 'Organization', value: 'CreoCorp Billing' },
      { metric: 'Report Name', value: 'Complete Customer Directory & Audit' },
      { metric: 'Total Registered Customers', value: customers.length },
      { metric: 'Total Combined Customer Visits', value: totalVisitsAll },
      { metric: 'Total Overall Revenue (₹)', value: `₹ ${totalRevenueAll.toFixed(2)}` },
      { metric: 'Export Timestamp', value: new Date().toLocaleString('en-IN') },
    ]);

    const headerRow3 = metaSheet.getRow(1);
    headerRow3.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow3.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF111820' },
    };

    // Write to Buffer & Send response
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="CreoCorp_Customer_Details_${Date.now()}.xlsx"`);
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    logger.error(`Error exporting customer details excel: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to export customer excel file.' });
  }
};

