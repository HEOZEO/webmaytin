// Test: create order qua POST /api/orders
// → đã fix coupon_usage. Verify order create thành công.
const http = require('http');

const BASE = 'http://localhost:5000';

function req(method, path, body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5173',
      ...extraHeaders
    };
    const options = { hostname: 'localhost', port: 5000, path, method, headers };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  // 1. Login admin để lấy CSRF token (route /csrf-token không cần auth)
  console.log('=== Bước 1: Get CSRF ===');
  let r = await req('GET', '/api/auth/csrf-token');
  console.log('STATUS:', r.status, 'csrftoken?', !!r.json?.csrfToken);
  let csrfToken = r.json?.csrfToken;
  if (!csrfToken) {
    console.log('❌ No CSRF token');
    return;
  }

  // 2. Tạo user test mới (POST /auth/register) - sẽ cần CSRF
  console.log('\n=== Bước 2: Register new test user ===');
  const email = `test_${Date.now()}@test.com`;
  // Note: register route cũng có CSRF middleware? Check - xem authRoutes
  // Register không có verifyCsrfToken middleware → không cần token
  r = await req('POST', '/api/auth/register', {
    email: email,
    password: 'Test@1234',
    full_name: 'Test User',
    phone: '0901234567'
  });
  console.log('STATUS:', r.status);
  console.log('BODY:', r.body);
  if (!r.json?.success) {
    console.log('❌ Register failed');
    return;
  }

  // 3. Login
  console.log('\n=== Bước 3: Login ===');
  r = await req('POST', '/api/auth/login', {
    email: email,
    password: 'Test@1234'
  });
  console.log('STATUS:', r.status);
  console.log('BODY:', r.body);
  if (!r.json?.token) {
    console.log('❌ Login failed');
    return;
  }
  const authToken = r.json.token;
  if (r.headers['x-csrf-token']) csrfToken = r.headers['x-csrf-token'];

  // 4. Create order WITH COUPON (the original bug)
  console.log('\n=== Bước 4: Create order WITH COUPON ===');
  r = await req('POST', '/api/orders', {
    items: [{ product_id: 1, quantity: 1 }],
    shipping_address: '123 Nguyễn Văn A, Phường 1, Quận 1, TP.HCM',
    phone: '0901234567',
    payment_method: 'COD',
    coupon_code: 'GIAM20%'  // Existing coupon
  }, { 'Authorization': `Bearer ${authToken}`, 'x-csrf-token': csrfToken });
  console.log('STATUS:', r.status);
  console.log('BODY:', r.body);
  if (!r.json?.success) {
    console.log('❌ Order create with coupon failed');
    return;
  }
  const orderId = r.json?.data?.id || r.json?.order?.id || r.json?.id;
  console.log('✅ Order created WITH COUPON, id =', orderId);
  if (r.headers['x-csrf-token']) csrfToken = r.headers['x-csrf-token'];

  // 5. Cancel order
  console.log('\n=== Bước 5: Cancel order ===');
  r = await req('PUT', `/api/orders/${orderId}/cancel`, {
    reason: 'Test cancel from automation'
  }, { 'Authorization': `Bearer ${authToken}`, 'x-csrf-token': csrfToken });
  console.log('STATUS:', r.status);
  console.log('BODY:', r.body);
  if (r.json?.success) {
    console.log('✅ Cancel order OK');
  } else {
    console.log('❌ Cancel failed');
  }

  // 6. Create 2nd order WITH SAME COUPON (test usage_per_user)
  console.log('\n=== Bước 6: Create 2nd order WITH SAME COUPON (test usage_per_user) ===');
  r = await req('POST', '/api/orders', {
    items: [{ product_id: 1, quantity: 1 }],
    shipping_address: '123 Nguyễn Văn A, Phường 1, Quận 1, TP.HCM',
    phone: '0901234567',
    payment_method: 'COD',
    coupon_code: 'GIAM20%'
  }, { 'Authorization': `Bearer ${authToken}`, 'x-csrf-token': csrfToken });
  console.log('STATUS:', r.status);
  console.log('BODY:', r.body);
  if (r.json?.success) {
    console.log('✅ 2nd order with SAME coupon OK - coupon usage_per_user works');
  } else if (r.json?.message?.includes('usage_per_user')) {
    console.log('✅ Stopped by usage_per_user logic (correct behavior)');
  } else {
    console.log('❌ 2nd order failed:', r.body);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
