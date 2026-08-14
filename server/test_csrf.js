const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/csrf-token',
  method: 'GET',
  headers: {
    'Origin': 'http://localhost:5173'
  }
};

const req = http.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:');
  for (const [k, v] of Object.entries(res.headers)) {
    console.log(`  ${k}: ${v}`);
  }
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('BODY:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('ERR:', e.message);
  process.exit(1);
});

req.end();
