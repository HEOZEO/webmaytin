const { pool } = require('./config/database');
(async () => {
  const r = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' AND column_name='permissions'"
  );
  console.log('Columns:', r.rows);

  const r2 = await pool.query(
    "SELECT id, email, role, permissions FROM users WHERE role IN ('admin','staff') ORDER BY role, id LIMIT 5"
  );
  console.log('Sample users:');
  console.log(JSON.stringify(r2.rows, null, 2));
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });