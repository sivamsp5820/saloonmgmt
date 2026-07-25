import nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';
import { pool } from '../config/db';
import { logger } from '../config/logger';

export interface ShiftReportEmailParams {
  billedByUsername: string;
  profileId?: string | null;
  recipientEmail: string;
  totalBills?: number;
  netRevenue?: number;
}

/**
 * Creates an Excel workbook buffer containing all transaction details for a biller's shift
 */
export const generateBillerShiftExcelBuffer = async (
  billedByUsername: string,
  profileId?: string | null
): Promise<Buffer> => {
  // 1. Query transactions for today by this biller with customer and service details
  const query = `
    SELECT 
      t.id,
      t.created_at,
      t.subtotal::float as subtotal,
      t.discount_amount::float as discount_amount,
      t.total::float as total,
      t.payment_mode,
      c.name as "customerName",
      c.phone as "customerPhone",
      p.name as "billedByName",
      p.username as "billedByUsername",
      COALESCE(
        json_agg(
          json_build_object(
            'price', ts.price::float,
            'serviceName', s.name,
            'category', s.category
          )
        ) FILTER (WHERE ts.id IS NOT NULL),
        '[]'
      ) as services_list
    FROM transactions t
    LEFT JOIN customers c ON t.customer_id = c.id
    LEFT JOIN profiles p ON t.billed_by = p.id
    LEFT JOIN transaction_services ts ON ts.transaction_id = t.id
    LEFT JOIN services s ON ts.service_id = s.id
    WHERE (p.username = $1 OR p.id = $2 OR t.billed_by = $2)
      AND DATE(t.created_at) = CURRENT_DATE
    GROUP BY t.id, c.id, p.id
    ORDER BY t.created_at DESC
  `;

  const result = await pool.query(query, [billedByUsername, profileId || null]);
  const rows = result.rows;

  // 2. Initialize ExcelJS Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CreoCorp Billing';
  workbook.lastModifiedBy = 'CreoCorp Billing System';
  workbook.created = new Date();

  // ── SHEET 1: Customer Billed Transactions (Main Customer Sheet) ──
  const custSheet = workbook.addWorksheet('Customer Billed Transactions');
  custSheet.columns = [
    { header: 'Customer Name', key: 'customerName', width: 26 },
    { header: 'Phone Number', key: 'customerPhone', width: 18 },
    { header: 'Billed Date & Time', key: 'createdAt', width: 22 },
    { header: 'Billed By (Cashier)', key: 'billedBy', width: 24 },
    { header: 'Services Rendered', key: 'services', width: 42 },
    { header: 'Subtotal (₹)', key: 'subtotal', width: 15 },
    { header: 'Discount (₹)', key: 'discount', width: 15 },
    { header: 'Net Paid Total (₹)', key: 'total', width: 16 },
    { header: 'Payment Mode', key: 'paymentMode', width: 16 },
    { header: 'Transaction ID', key: 'id', width: 38 },
  ];

  // Header Row Styling
  const headerRow1 = custSheet.getRow(1);
  headerRow1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC9A84C' }, // Luxury Gold
  };
  headerRow1.alignment = { vertical: 'middle', horizontal: 'center' };

  const grandTotal = rows.reduce((sum, r) => sum + parseFloat(r.total || 0), 0);
  const totalSubtotal = rows.reduce((sum, r) => sum + parseFloat(r.subtotal || 0), 0);
  const totalDiscount = rows.reduce((sum, r) => sum + parseFloat(r.discount_amount || 0), 0);
  const totalCount = rows.length;

  rows.forEach((r) => {
    const servicesStr = (r.services_list || []).map((s: any) => s.serviceName).filter(Boolean).join(', ');
    custSheet.addRow({
      customerName: r.customerName || 'Walk-in Guest',
      customerPhone: r.customerPhone || 'N/A',
      createdAt: new Date(r.created_at).toLocaleString('en-IN'),
      billedBy: `${r.billedByName || billedByUsername} (@${r.billedByUsername || billedByUsername})`,
      services: servicesStr || 'General Service',
      subtotal: parseFloat(r.subtotal || 0),
      discount: parseFloat(r.discount_amount || 0),
      total: parseFloat(r.total || 0),
      paymentMode: r.payment_mode || 'Cash',
      id: r.id,
    });
  });

  // Summary Total Row at bottom of Customer Sheet
  const footerRow1 = custSheet.addRow({
    customerName: 'TOTAL SUMMARY',
    customerPhone: '',
    createdAt: '',
    billedBy: '',
    services: `${totalCount} Customers Billed`,
    subtotal: totalSubtotal,
    discount: totalDiscount,
    total: grandTotal,
    paymentMode: '',
    id: '',
  });

  footerRow1.font = { bold: true };
  footerRow1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8EDF2' },
  };

  // ── SHEET 2: Customer Itemized Services Breakdown ──
  const serviceSheet = workbook.addWorksheet('Customer Services Breakdown');
  serviceSheet.columns = [
    { header: 'Customer Name', key: 'customerName', width: 26 },
    { header: 'Phone Number', key: 'customerPhone', width: 18 },
    { header: 'Service Treatment Name', key: 'serviceName', width: 32 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Service Price (₹)', key: 'price', width: 18 },
    { header: 'Billed By', key: 'billedBy', width: 24 },
    { header: 'Date & Time', key: 'createdAt', width: 22 },
  ];

  const headerRow2 = serviceSheet.getRow(1);
  headerRow2.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF161E28' }, // Dark Slate Header
  };
  headerRow2.alignment = { vertical: 'middle', horizontal: 'center' };

  rows.forEach((r) => {
    (r.services_list || []).forEach((svc: any) => {
      serviceSheet.addRow({
        customerName: r.customerName || 'Walk-in Guest',
        customerPhone: r.customerPhone || 'N/A',
        serviceName: svc.serviceName || 'Service Treatment',
        category: svc.category || 'General',
        price: parseFloat(svc.price || 0),
        billedBy: r.billedByName || billedByUsername,
        createdAt: new Date(r.created_at).toLocaleString('en-IN'),
      });
    });
  });

  // ── SHEET 3: Cashier Shift Summary ──
  const summarySheet = workbook.addWorksheet('Shift Summary Overview');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 32 },
    { header: 'Details / Count', key: 'value', width: 35 },
  ];

  const uniqueCustomers = new Set(rows.map((r) => r.customerPhone || r.customerName || r.id)).size;

  summarySheet.addRows([
    { metric: 'Company Name', value: 'CreoCorp Billing' },
    { metric: 'Report Title', value: 'Cashier Shift Customer Billing Audit' },
    { metric: 'Cashier Biller Username', value: `@${billedByUsername}` },
    { metric: 'Biller Name', value: rows[0]?.billedByName || billedByUsername },
    { metric: 'Report Generation Date', value: new Date().toLocaleString('en-IN') },
    { metric: 'Total Unique Customers Billed', value: uniqueCustomers },
    { metric: 'Total Transactions Processed', value: totalCount },
    { metric: 'Total Subtotal Billed (₹)', value: `₹ ${totalSubtotal.toFixed(2)}` },
    { metric: 'Total Discounts Given (₹)', value: `₹ ${totalDiscount.toFixed(2)}` },
    { metric: 'Total Shift Revenue (₹)', value: `₹ ${grandTotal.toFixed(2)}` },
  ]);

  const headerRow3 = summarySheet.getRow(1);
  headerRow3.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow3.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF161E28' },
  };

  // Convert workbook to Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

/**
 * Creates Nodemailer Transporter
 * ====================================================================================
 * 🔑 HARDCODED SENDER SMTP & PASSWORD CREDENTIALS:
 * Replace 'your-sender-email@gmail.com' and 'your-16-digit-app-password' below
 * with your real SMTP email address and app password!
 * ====================================================================================
 */
const createTransporter = async () => {
  // Hardcoded Sender Credentials
  const host = 'smtp.gmail.com';
  const port = 587;
  const user = 'bytebeatitsolutions@gmail.com';    // <-- ✉️ YOUR SENDER EMAIL HERE
  const pass = 'ryzs gspa fiyn avpy';     // <-- 🔑 YOUR SENDER APP PASSWORD HERE

  if (user && !user.includes('your-sender-email')) {
    return nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // Fallback testing transport if user credentials haven't been replaced yet
  return nodemailer.createTransport({
    jsonTransport: true,
  });
};

/**
 * Compiles shift data, builds Excel attachment, and emails it using Nodemailer
 */
export const sendShiftReportEmailWithExcel = async (params: ShiftReportEmailParams) => {
  try {
    const { billedByUsername, profileId, recipientEmail, totalBills, netRevenue } = params;

    // 1. Generate Excel Attachment Buffer
    const excelBuffer = await generateBillerShiftExcelBuffer(billedByUsername, profileId);

    // 2. Format Date and Filename
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `Shift_Billed_Details_${billedByUsername}_${todayStr}.xlsx`;

    // 3. Construct HTML Email Body with Inline-Styled Email Table Layout
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>CreoCorp Billing Shift Audit</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #0d1117; color: #e8edf2; margin: 0; padding: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #161e28; border: 1px solid #c9a84c; border-radius: 12px; overflow: hidden; font-family: Arial, sans-serif;">
          
          <!-- HEADER -->
          <tr>
            <td style="padding: 30px 30px 20px 30px; text-align: center; border-bottom: 1px solid #1e2d3d; background-color: #111820;">
              <div style="font-size: 26px; font-weight: 900; color: #c9a84c; letter-spacing: 2px; text-transform: uppercase;">CreoCorp Billing</div>
              <div style="font-size: 11px; color: #94a3b8; tracking: 3px; text-transform: uppercase; margin-top: 6px; font-weight: 700;">CASHIER SHIFT AUDIT & BILLED DETAILS REPORT</div>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding: 25px 30px;">
              <p style="color: #e2e8f0; font-size: 15px; margin-top: 0; font-weight: 600;">Hello,</p>
              <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 25px;">
                Cashier <strong style="color: #c9a84c;">${billedByUsername}</strong> has concluded their billing shift and logged out. The shift metrics summary and itemized customer transactions Excel spreadsheet are detailed below:
              </p>

              <!-- METRICS TABLE -->
              <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #0d1117; border: 1px solid #1e2d3d; border-radius: 8px; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #1e2d3d;">
                  <td style="color: #94a3b8; font-size: 13px; font-weight: 700; width: 45%; text-transform: uppercase;">Cashier / Biller</td>
                  <td style="color: #ffffff; font-size: 14px; font-weight: 700; text-align: right; width: 55%;">${billedByUsername}</td>
                </tr>
                <tr style="border-bottom: 1px solid #1e2d3d;">
                  <td style="color: #94a3b8; font-size: 13px; font-weight: 700; text-transform: uppercase;">Date & Time</td>
                  <td style="color: #ffffff; font-size: 14px; font-weight: 700; text-align: right;">${new Date().toLocaleString('en-IN')}</td>
                </tr>
                <tr style="border-bottom: 1px solid #1e2d3d;">
                  <td style="color: #94a3b8; font-size: 13px; font-weight: 700; text-transform: uppercase;">Total Bills Billed</td>
                  <td style="color: #ffffff; font-size: 14px; font-weight: 700; text-align: right;">${totalBills ?? 'See Excel'}</td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; font-size: 13px; font-weight: 700; text-transform: uppercase;">Total Shift Revenue</td>
                  <td style="color: #c9a84c; font-size: 20px; font-weight: 900; text-align: right;">₹ ${(netRevenue || 0).toFixed(2)}</td>
                </tr>
              </table>

              <!-- ATTACHMENT NOTICE -->
              <table width="100%" cellpadding="12" cellspacing="0" style="margin-top: 20px; background-color: rgba(0,201,122,0.1); border: 1px solid rgba(0,201,122,0.3); border-radius: 8px;">
                <tr>
                  <td style="color: #00c97a; font-size: 13px; font-weight: 600; line-height: 1.5;">
                    📎 <strong>Excel File Attached:</strong> <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #ffffff;">${filename}</code><br>
                    Contains itemized customer records, phone numbers, services rendered, discounts, and payment mode splits.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 20px; text-align: center; border-top: 1px solid #1e2d3d; background-color: #0d1117; color: #64748b; font-size: 11px; line-height: 1.5;">
              Automated Shift Audit Dispatch by CreoCorp Saloon Management System.<br>
              Powered by NodeMailer & ExcelJS
            </td>
          </tr>

        </table>
      </body>
      </html>
    `;

    // 4. Send Email via Nodemailer
    // ====================================================================================
    // 📌 HARDCODED MAIL OPTIONS:
    // - `from` is HARDCODED below as the sender email address.
    // - `to` is DYNAMIC (takes the recipient address from the Email Settings form).
    // ====================================================================================
    const transporter = await createTransporter();
    const mailOptions = {
      from: '"CreoCorp Billing System" <bytebeatitsolutions@gmail.com>', // HARDCODED SENDER EMAIL
      to: recipientEmail,                                                // DYNAMIC RECIPIENT FROM FORM
      subject: `[CreoCorp Billing] Biller Shift Audit - ${billedByUsername} (${todayStr})`,
      html: htmlContent,
      attachments: [
        {
          filename: filename,
          content: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`📧 NODEMAILER DISPATCH SUCCESS: Shift report with Excel sent to ${recipientEmail}. MessageId: ${info.messageId || 'JSON-OK'}`);

    return {
      success: true,
      messageId: info.messageId,
      filename,
      recipientEmail,
    };
  } catch (err: any) {
    logger.error(`Error in sendShiftReportEmailWithExcel: ${err.message}`);
    throw err;
  }
};
