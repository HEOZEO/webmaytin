const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const hash = await bcrypt.hash('Admin123@', 10);
    await pool.query("UPDATE users SET password = $1 WHERE username = 'admin'", [hash]);
    console.log('✅ Updated admin password to Admin123@');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
