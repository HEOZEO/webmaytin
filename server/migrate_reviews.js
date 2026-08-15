const { pool } = require('./config/database');

async function migrate() {
  try {
    await pool.query('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE');
    console.log('✅ Added is_hidden column to reviews table');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
