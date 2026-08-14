require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { pool } = require('./config/database');

async function fix() {
  console.log('🔧 Fixing payment constraint...');
  try {
    await pool.query(`
      ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_status_check;
      ALTER TABLE payments ADD CONSTRAINT payments_payment_status_check 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'));
    `);
    console.log('✅ Done!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

fix();
