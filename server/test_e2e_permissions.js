/**
 * Test E2E permissions flow
 * 1. Login as admin
 * 2. GET /admin/users/permissions/default
 * 3. GET /admin/users (find staff)
 * 4. GET /admin/users/{id}/permissions
 * 5. PUT /admin/users/{id}/permissions
 */
const http = require('http');

function request(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const options = { hostname: 'localhost', port: 5000, path, method, headers };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('===== E2E TEST =====\n');

  // Lấy CSRF token
  const csrfRes = await new Promise((resolve, reject) => {
    http.get('http://localhost:5000/api/auth/csrf-token', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data || '{}'), cookie: res.headers['set-cookie'] }));
    });
  });
  console.log('CSRF:', csrfRes.status, csrfRes.body?.csrfToken ? 'OK' : 'MISSING');
  const csrfToken = csrfRes.body?.csrfToken;

  // Login
  const login = await request('POST', '/api/auth/login',
    { 'Content-Type': 'application/json' },
    { email: 'admin@gmail.com', password: 'Admin@123' });
  console.log('\nLogin:', login.status, login.body?.success ? 'OK' : 'FAIL');
  if (login.body?.message) console.log('  Message:', login.body.message);
  const token = login.body?.token;

  if (!token) {
    console.log('Cannot proceed without token');
    return;
  }

  // Test default
  console.log('\n--- GET /admin/users/permissions/default ---');
  const def = await request('GET', '/api/admin/users/permissions/default',
    { Authorization: `Bearer ${token}` });
  console.log('Status:', def.status);
  console.log('Body keys:', Object.keys(def.body || {}));
  if (def.body?.data) console.log('Data keys:', Object.keys(def.body.data));

  // Get users
  console.log('\n--- GET /admin/users ---');
  const users = await request('GET', '/api/admin/users?role=staff',
    { Authorization: `Bearer ${token}` });
  console.log('Status:', users.status);
  const staff = users.body?.data?.[0];
  console.log('Staff found:', staff ? `#${staff.id} ${staff.email}` : 'NONE');

  if (!staff) return;

  // Get permissions of staff
  console.log(`\n--- GET /admin/users/${staff.id}/permissions ---`);
  const perm = await request('GET', `/api/admin/users/${staff.id}/permissions`,
    { Authorization: `Bearer ${token}` });
  console.log('Status:', perm.status);
  if (perm.body?.data) {
    console.log('Data userId:', perm.body.data.userId);
    console.log('Data permissions keys:', Object.keys(perm.body.data.permissions || {}));
  } else {
    console.log('Body:', JSON.stringify(perm.body).substring(0, 300));
  }

  // Update permissions
  console.log(`\n--- PUT /admin/users/${staff.id}/permissions ---`);
  const newPerms = {
    dashboard: true,
    products: { view: true, create: false, update: false, delete: false, bulk_stock: false },
    inventory: { view: true, update: false },
    orders: { view: true, create: false, update_status: false, cancel: false, delete: false, export: false },
    users: { view: false, lock_customer: false },
    analytics: { view: false },
    contacts: { view: false, reply: false, delete: false }
  };
  const update = await request('PUT', `/api/admin/users/${staff.id}/permissions`,
    {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken
    },
    { permissions: newPerms });
  console.log('Status:', update.status);
  console.log('Body:', JSON.stringify(update.body).substring(0, 500));
})().catch(err => { console.error('TEST ERROR:', err); });