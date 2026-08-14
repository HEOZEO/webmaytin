const { pool } = require('./config/database');

(async () => {
  try {
    const res = await pool.query("SELECT email, username FROM users WHERE email = 'admin@gmail.com'");
    console.log(res.rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
