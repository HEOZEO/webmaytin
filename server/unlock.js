const { pool } = require('./config/database');

(async () => {
  try {
    await pool.query("UPDATE users SET is_account_locked = FALSE, locked_until = NULL, failed_login_attempts = 0, failed_login_reset_at = NULL");
    console.log('✅ Đã mở khóa tất cả tài khoản thành công!');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
