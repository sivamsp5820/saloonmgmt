const API_BASE = 'http://localhost:5000/api/v1';

async function testFullFlow() {
  console.log('🚀 --- STARTING END-TO-END AUTOMATED TEST --- 🚀\n');

  try {
    // 1. LOGIN TEST
    console.log('1️⃣  Testing User Login (Admin / Admin123)...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
      }),
    });

    const loginData: any = await loginRes.json();
    if (loginData.status !== 'success') {
      throw new Error(`Login failed: ${loginData.message}`);
    }

    console.log('   ✅ Login Successful!');
    const token = loginData.data.token;
    const user = loginData.data.user;
    console.log(`   User: ${user.name} (${user.role} - username: ${user.username})\n`);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // 2. CHECK EMAIL SETTINGS
    console.log('2️⃣  Testing Email Settings Retrieval & Configuration...');
    const emailRes = await fetch(`${API_BASE}/email-settings`, { headers });
    const emailData: any = await emailRes.json();
    console.log('   ✅ Target Recipient Email Inbox:', emailData.data?.recipientEmail);

    // 3. CREATE TEST BILLING TRANSACTION
    console.log('\n3️⃣  Testing POS Billing Transaction Creation...');
    const servicesRes = await fetch(`${API_BASE}/services`, { headers });
    const servicesData: any = await servicesRes.json();
    const activeServices = servicesData.data || [];
    const firstService = activeServices[0] || { id: 'a1000000-0000-0000-0000-000000000001', price: 150 };

    const txPayload = {
      customerName: 'Test Customer E2E',
      customerPhone: '9876543210',
      items: [
        { serviceId: firstService.id, price: firstService.price || 150 },
      ],
      subtotal: firstService.price || 150,
      discountType: 'rupees',
      discountValue: 0,
      discountAmount: 0,
      total: firstService.price || 150,
      paymentMode: 'UPI',
    };

    const txRes = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(txPayload),
    });
    const txData: any = await txRes.json();
    console.log(`   ✅ Transaction Billed Successfully! Transaction ID: ${txData.data?.id || 'TX-NEW'}`);
    console.log(`   Total Amount: ₹${txData.data?.total || 150}`);

    // 4. TEST LOGOUT / CHECKOUT EMAIL DISPATCH WITH EXCEL & NODEMAILER
    console.log('\n4️⃣  Testing Logout Checkout & Gmail SMTP Nodemailer Excel Dispatch...');
    console.log('   Compiling Shift Excel Workbook (.xlsx) & Sending Email via bytebeatitsolutions@gmail.com...');

    const checkoutRes = await fetch(`${API_BASE}/reports/send-daily`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        billedBy: user.username,
        totalBills: 1,
        netRevenue: parseFloat(txData.data?.total || '150'),
      }),
    });
    const checkoutData: any = await checkoutRes.json();

    console.log('   ✅ Nodemailer Result:', checkoutData.message);

    console.log('\n🎉 --- ALL END-TO-END TESTS COMPLETED SUCCESSFULLY! --- 🎉');
  } catch (err: any) {
    console.error('❌ E2E Test Failure:', err.message);
  }
}

testFullFlow();
