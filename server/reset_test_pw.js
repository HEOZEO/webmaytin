// Reset admin password for test
const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

(async () => {
  try {
    const hash = await bcrypt.hash('Admin@123', 10);
    const r = await pool.query(
      "UPDATE users SET password = $1 WHERE email = 'admin@gmail.com' RETURNING id, email",
      [hash]
    );
    console.log('Reset OK:', r.rows);

    // Also reset user 22
    const r2 = await pool.query(
      "UPDATE users SET password = $1 WHERE id = 22 RETURNING id, email",
      [hash]
    );
    console.log('Reset customer OK:', r2.rows);

    await pool.end();
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  }
})();
