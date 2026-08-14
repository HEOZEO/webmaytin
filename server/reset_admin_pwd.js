// Reset admin password to Admin@123 for testing
const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

(async () => {
  const hash = await bcrypt.hash('Admin@123', 10);
  await pool.query(
    `UPDATE users SET password = $1 WHERE email = 'admin@gmail.com'`,
    [hash]
  );
  console.log('✅ Reset admin password to Admin@123');

  const r = await pool.query(`SELECT id, email, role FROM users WHERE email IN ('admin@gmail.com', 'staff1@gmail.com')`);
  console.log('Sample users:', r.rows);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });