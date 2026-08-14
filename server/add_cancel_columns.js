require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { pool } = require('./config/database');

async function addColumn() {
  console.log('🔧 Adding cancel_reason column to orders...');
  try {
    await pool.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
    `);
    console.log('✅ Done!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

addColumn();