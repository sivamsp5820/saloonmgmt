<?php
/**
 * Creo Corp — Saloon Billing System
 * Daily Sales Report Mailer (Triggered on User Offline)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Adjust according to your environment setup
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// 1. Configuration Constants
define('ADMIN_EMAIL', 'andigitalmount@gmail.com');
define('FROM_EMAIL', 'no-reply@creocorptechnologies.com'); // Match your server domain
define('SALOON_NAME', 'GLOW & CO. Luxury Saloon');

// 2. Capture and Validate Incoming Post Data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['billedBy'])) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid payload. Missing context provider matching structural user signatures.'
    ]);
    exit;
}

$billedBy = trim($data['billedBy']);
$todayStr = date('Y-m-d');

/**
 * ─── DATA RETRIEVAL NOTICE ───
 * In a fully productionized setup, your localStorage 'gc_bills' structural array should 
 * be synchronized with an actual database backend system (MySQL/PostgreSQL) via REST hooks.
 * * For flawless compliance with your standalone frontend architecture, we simulate reading 
 * the structural data array filtered strictly by today's calendar stamp and user node signature.
 */

// Simulated internal data acquisition strategy (or replace directly with Database queries)
// $query = "SELECT * FROM bills WHERE DATE(ts) = CURDATE() AND billedBy = ?";
$cashierName = ($billedBy === 'billing1') ? 'Counter Cashier Terminal 1' : (($billedBy === 'billing2') ? 'Counter Cashier Terminal 2' : 'Unknown Terminal');

/* * If passing the filtered metrics directly via payload for localized tracking fallback, 
 * look for explicit arrays passed from the operational client workstation state:
 */
$totalBillsCount = isset($data['totalBills']) ? intval($data['totalBills']) : 0;
$netRevenue = isset($data['netRevenue']) ? floatval($data['netRevenue']) : 0.00;

// 3. Draft Structural HTML Email Template Layout Architecture
$subject = "⚠️ Operational Status Notice: " . SALOON_NAME . " Terminal Offline Report (" . date('d-M-Y') . ")";

$message = "
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f8; color: #333333; margin: 0; padding: 20px; }
        .container { max-width: 600px; background: #ffffff; border: 1px solid #e1e8ed; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #111820 0%, #1c2532 100%); padding: 30px; text-align: center; border-bottom: 3px solid #c9a84c; }
        .header h1 { color: #c9a84c; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
        .header p { color: #5a6a7a; margin: 5px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; }
        .content { padding: 30px; }
        .status-badge { display: inline-block; background: rgba(224, 85, 85, 0.12); color: #e05555; border: 1px solid rgba(224, 85, 85, 0.25); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-bottom: 20px; }
        .metrics-grid { display: table; width: 100%; margin-bottom: 25px; }
        .metric-card { display: table-cell; width: 50%; background: #f8fafc; border: 1px solid #edf2f7; border-radius: 8px; padding: 20px; text-align: center; }
        .metric-card.left { border-right: 6px solid #f4f6f8; }
        .metric-val { font-size: 24px; font-weight: 800; color: #111820; margin-bottom: 4px; }
        .metric-val.green { color: #00c97a; }
        .metric-lbl { font-size: 11px; color: #5a6a7a; font-weight: 600; text-transform: uppercase; }
        .info-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .info-table td { padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 14px; }
        .info-table td.label { color: #5a6a7a; font-weight: 500; width: 40%; }
        .info-table td.value { color: #111820; font-weight: 600; text-align: right; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #edf2f7; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Creo Corp</h1>
            <p>Saloon Billing Gateway Insights</p>
        </div>
        <div class='content'>
            <div class='status-badge'>🔴 TERMINAL SHUTDOWN (OFFLINE)</div>
            <p style='font-size: 15px; line-height: 1.6; color: #4a5568;'>An end-of-session trigger has been logged. Counter terminal workstation connection changed state to <strong>OFFLINE</strong>. Summarized operational data is detailed below:</p>
            
            <div class='metrics-grid'>
                <div class='metric-card left'>
                    <div class='metric-val green'>₹" . number_format($netRevenue, 2) . "</div>
                    <div class='metric-lbl'>Shift Net Revenue</div>
                </div>
                <div class='metric-card'>
                    <div class='metric-val'>" . $totalBillsCount . "</div>
                    <div class='metric-lbl'>Total Transactions</div>
                </div>
            </div>

            <table class='info-table'>
                <tr>
                    <td class='label'>Terminal Signature</td>
                    <td class='value'>" . htmlspecialchars($billedBy) . "</td>
                </tr>
                <tr>
                    <td class='label'>Authorized Operator</td>
                    <td class='value'>" . htmlspecialchars($cashierName) . "</td>
                </tr>
                <tr>
                    <td class='label'>Closing Timestamp</td>
                    <td class='value'>" . date('d-M-Y H:i:s T') . "</td>
                </tr>
            </table>
        </div>
        <div class='footer'>
            Automated compliance engine statement courtesy of Creo Corp Technologies.
        </div>
    </div>
</body>
</html>
";

// 4. Set Headers for Complex Multipart HTML Mail Format Delivery
$headers   = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-type: text/html; charset=utf-8';
$headers[] = 'From: ' . SALOON_NAME . ' <' . FROM_EMAIL . '>';
$headers[] = 'Reply-To: ' . FROM_EMAIL;
$headers[] = 'X-Mailer: PHP/' . phpversion();

// 5. Fire Transport Layer Mail Delivery Verification Execution
if (mail(ADMIN_EMAIL, $subject, $message, implode("\r\n", $headers))) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Daily sales summary successfully compiled and routed via SMTP to admin endpoint targets.'
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Transactional email packaging failure on operational internal mail transfer layer (sendmail/postfix).'
    ]);
}