const { pool } = require('./config/database');

async function resetLockout() {
  try {
    console.log('🔓 Resetting lockout for admin account...');
    
    await pool.query('DELETE FROM login_attempts WHERE user_id = 19');
    await pool.query('UPDATE users SET is_active = true WHERE id = 19');
    
    console.log('✅ Lockout reset & account activated!');
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

resetLockout();
