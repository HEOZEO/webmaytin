// E2E test: login → create order → cancel order
// Curl block để hoạt động trên PowerShell qua node
const http = require('http');

const BASE = 'http://localhost:5000';
let csrfToken = null;
let authToken = null;
let cookies = [];

// Helper: HTTP request
function req(method, path, body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5173',
      ...extraHeaders
    };
    if (cookies.length > 0) headers['Cookie'] = cookies.join('; ');
    if (body && csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      headers['x-csrf-token'] = csrfToken;
    }

    const options = { hostname: 'localhost', port: 5000, path, method, headers };
    const r = http.request(options, (res) => {
      // Capture cookies
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        for (const c of setCookie) {
          const [pair] = c.split(';');
          if (!cookies.some(existing => existing.startsWith(pair.split('=')[0]))) {
            cookies.push(pair);
          }
        }
      }
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
  console.log('=== STEP 1: Get CSRF token ===');
  let r = await req('GET', '/api/auth/csrf-token');
  console.log('STATUS:', r.status);
  if (r.json?.csrfToken) {
    csrfToken = r.json.csrfToken;
    console.log('✅ Got CSRF token, length =', csrfToken.length);
  } else {
    console.log('❌ No csrfToken in response:', r.body);
    return;
  }

  console.log('\n=== STEP 2: Login ===');
  r = await req('POST', '/api/auth/login', {
    email: 'heoday0608@gmail.com',  // CHANGE if needed
    password: 'password123'  // CHANGE if needed
  });
  console.log('STATUS:', r.status);
  console.log('BODY:', r.body);
  if (r.json?.token) {
    authToken = r.json.token;
    if (r.json.csrfToken) csrfToken = r.json.csrfToken;
    console.log('✅ Login OK');
  } else {
    console.log('❌ Login failed - kiểm tra email/password trong test script');
    return;
  }

  // Update CSRF after login (token rotation)
  if (r.headers['x-csrf-token']) csrfToken = r.headers['x-csrf-token'];

  console.log('\n=== STEP 3: Create order ===');
  // Get a product id
  const products = await req('GET', '/api/products?limit=1');
  const productId = products.json?.data?.[0]?.id || products.json?.products?.[0]?.id;
  if (!productId) {
    console.log('❌ No product found');
    return;
  }
  console.log('Using productId:', productId);

  r = await req('POST', '/api/orders', {
    items: [{ product_id: productId, quantity: 1 }],
    shipping_address: '123 Nguyễn Văn A, Phường 1, Quận 1, TP.HCM',
    phone: '0912345678',
    payment_method: 'COD',
    coupon_code: 'WELCOME10'  // Try the coupon (whichever exists)
  }, { 'Authorization': `Bearer ${authToken}` });
  console.log('STATUS:', r.status);
  console.log('BODY:', r.body);

  if (!r.json?.success) {
    console.log('❌ Order creation failed');
    // Try without coupon
    console.log('\n=== STEP 3b: Try without coupon ===');
    r = await req('POST', '/api/orders', {
      items: [{ product_id: productId, quantity: 1 }],
      shipping_address: '123 Nguyễn Văn A, Phường 1, Quận 1, TP.HCM',
      phone: '0912345678',
      payment_method: 'COD'
    }, { 'Authorization': `Bearer ${authToken}` });
    console.log('STATUS:', r.status);
    console.log('BODY:', r.body);
    if (!r.json?.success) {
      console.log('❌ Order creation failed even without coupon');
      return;
    }
  }

  const orderId = r.json?.data?.id || r.json?.order?.id || r.json?.id;
  console.log('✅ Order created, id =', orderId);

  // Update CSRF
  if (r.headers['x-csrf-token']) csrfToken = r.headers['x-csrf-token'];

  console.log('\n=== STEP 4: Cancel order ===');
  r = await req('PUT', `/api/orders/${orderId}/cancel`, {
    reason: 'Test cancel - automated'
  }, { 'Authorization': `Bearer ${authToken}` });
  console.log('STATUS:', r.status);
  console.log('BODY:', r.body);
  if (r.json?.success) {
    console.log('✅ Cancel order OK');
  } else {
    console.log('❌ Cancel order failed');
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
