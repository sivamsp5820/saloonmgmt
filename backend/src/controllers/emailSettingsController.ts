import { Request, Response } from 'express';
import { pool } from '../config/db';
import { logger } from '../config/logger';

export const getEmailSettings = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM email_settings ORDER BY updated_at DESC LIMIT 1');
    if (result.rows.length === 0) {
      return res.json({
        status: 'success',
        data: {
          recipientEmail: 'andigitalmount@gmail.com',
          recipientName: 'Store Administrator',
          subjectPrefix: 'CreoCorp Billing Report',
          sendDailySales: true,
          sendShiftCheckout: true,
          sendExpenseAlerts: false,
        },
      });
    }

    const row = result.rows[0];
    return res.json({
      status: 'success',
      data: {
        id: row.id,
        recipientEmail: row.recipient_email,
        recipientName: row.recipient_name,
        subjectPrefix: row.subject_prefix,
        sendDailySales: row.send_daily_sales,
        sendShiftCheckout: row.send_shift_checkout,
        sendExpenseAlerts: row.send_expense_alerts,
        updatedAt: row.updated_at,
      },
    });
  } catch (err: any) {
    logger.error(`Error in getEmailSettings: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve email settings.' });
  }
};

export const updateEmailSettings = async (req: Request, res: Response) => {
  try {
    const { recipientEmail, recipientName, subjectPrefix, sendDailySales, sendShiftCheckout, sendExpenseAlerts } = req.body;

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return res.status(400).json({ status: 'error', message: 'Valid recipient email address is required.' });
    }

    const checkRes = await pool.query('SELECT id FROM email_settings LIMIT 1');

    if (checkRes.rows.length > 0) {
      const existingId = checkRes.rows[0].id;
      await pool.query(
        `UPDATE email_settings 
         SET recipient_email = $1, 
             recipient_name = $2, 
             subject_prefix = $3, 
             send_daily_sales = $4, 
             send_shift_checkout = $5, 
             send_expense_alerts = $6, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $7`,
        [
          recipientEmail,
          recipientName || 'Store Manager',
          subjectPrefix || 'CreoCorp Billing Report',
          sendDailySales ?? true,
          sendShiftCheckout ?? true,
          sendExpenseAlerts ?? false,
          existingId,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO email_settings (recipient_email, recipient_name, subject_prefix, send_daily_sales, send_shift_checkout, send_expense_alerts)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          recipientEmail,
          recipientName || 'Store Manager',
          subjectPrefix || 'CreoCorp Billing Report',
          sendDailySales ?? true,
          sendShiftCheckout ?? true,
          sendExpenseAlerts ?? false,
        ]
      );
    }

    logger.info(`📧 EMAIL SETTINGS UPDATED: Target recipient saved as ${recipientEmail}`);

    return res.json({
      status: 'success',
      message: 'Email configuration updated successfully.',
      data: {
        recipientEmail,
        recipientName,
        subjectPrefix,
        sendDailySales,
        sendShiftCheckout,
        sendExpenseAlerts,
      },
    });
  } catch (err: any) {
    logger.error(`Error in updateEmailSettings: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to update email settings.' });
  }
};

import { sendShiftReportEmailWithExcel } from '../services/emailService';

export const sendManualReportEmail = async (req: Request, res: Response) => {
  try {
    const { reportType, customRecipientEmail } = req.body;

    // 1. Fetch recipient email from database settings
    let targetEmail = customRecipientEmail;
    if (!targetEmail) {
      const settingsRes = await pool.query('SELECT recipient_email FROM email_settings LIMIT 1');
      if (settingsRes.rows.length > 0 && settingsRes.rows[0].recipient_email) {
        targetEmail = settingsRes.rows[0].recipient_email;
      } else {
        targetEmail = 'andigitalmount@gmail.com';
      }
    }

    // 2. Fetch summary metrics for report compilation
    const txRes = await pool.query(`
      SELECT total::float as total, payment_mode, created_at 
      FROM transactions 
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    
    const todayTxs = txRes.rows;
    const totalSales = todayTxs.reduce((sum, t) => sum + parseFloat(t.total), 0);
    const txCount = todayTxs.length;

    // 3. Dispatch report email with Excel attachment using Nodemailer
    const result = await sendShiftReportEmailWithExcel({
      billedByUsername: req.user?.username || 'Administrator',
      profileId: req.user?.id || null,
      recipientEmail: targetEmail,
      totalBills: txCount,
      netRevenue: totalSales,
    });

    const emailSubject = `[CreoCorp Billing] Manual ${reportType || 'Daily Sales Summary'} - ${new Date().toLocaleDateString()}`;

    logger.info(`📧 MANUAL EMAIL & EXCEL DISPATCH TRIGGERED: Target ${targetEmail}`);

    return res.json({
      status: 'success',
      message: `Report email with Excel attachment successfully sent to ${targetEmail}.`,
      dispatchSummary: {
        recipientEmail: targetEmail,
        subject: emailSubject,
        todaySales: totalSales,
        transactionCount: txCount,
        dispatchedAt: new Date().toISOString(),
        filename: result.filename,
      },
    });
  } catch (err: any) {
    logger.error(`Error in sendManualReportEmail: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Failed to send report email.' });
  }
};
