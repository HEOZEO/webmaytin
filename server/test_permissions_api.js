// Test permissions API end-to-end
const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
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
  // 1. Login admin
  console.log('▶ Login admin...');
  const loginRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login',
    method: 'POST', headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@gmail.com', password: 'Admin@123' });

  console.log('Login status:', loginRes.status);
  const token = loginRes.body?.token || loginRes.body?.data?.token;
  console.log('Token:', token ? token.substring(0, 30) + '...' : 'NONE');

  if (!token) {
    console.log('Login response:', JSON.stringify(loginRes.body, null, 2));
    return;
  }

  // 2. Get default permissions
  console.log('\n▶ Get default permissions...');
  const defRes = await request({
    hostname: 'localhost', port: 5000,
    path: '/api/admin/users/permissions/default',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Default status:', defRes.status);
  console.log('Default body:', JSON.stringify(defRes.body, null, 2).substring(0, 500));

  // 3. Get all users
  console.log('\n▶ Get all users...');
  const usersRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/admin/users',
    method: 'GET', headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Users status:', usersRes.status);
  const staff = (usersRes.body?.data || []).find(u => u.role === 'staff');
  console.log('Found staff:', staff?.id, staff?.email);

  if (staff) {
    // 4. Get permissions of staff
    console.log(`\n▶ Get permissions of staff #${staff.id}...`);
    const permRes = await request({
      hostname: 'localhost', port: 5000,
      path: `/api/admin/users/${staff.id}/permissions`,
      method: 'GET', headers: { 'Authorization': 'Bearer ' + token }
    });
    console.log('Get status:', permRes.status);
    console.log('Get body:', JSON.stringify(permRes.body, null, 2).substring(0, 800));

    // 5. Update permissions
    console.log(`\n▶ Update permissions of staff #${staff.id}...`);
    const newPerms = {
      dashboard: true,
      products: { view: true, create: false, update: false, delete: false, bulk_stock: false },
      inventory: { view: true, update: false },
      orders: { view: true, create: false, update_status: false, cancel: false, delete: false, export: false },
      users: { view: false, lock_customer: false },
      analytics: { view: false },
      contacts: { view: false, reply: false, delete: false }
    };
    const updateRes = await request({
      hostname: 'localhost', port: 5000,
      path: `/api/admin/users/${staff.id}/permissions`,
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    }, { permissions: newPerms });
    console.log('Update status:', updateRes.status);
    console.log('Update body:', JSON.stringify(updateRes.body, null, 2).substring(0, 500));
  }
})().catch(err => console.error('Test error:', err.message));