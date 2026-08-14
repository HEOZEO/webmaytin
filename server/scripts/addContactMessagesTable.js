const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
  try {
    console.log('🔧 Creating contact_messages table...');
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', 'add_contact_messages_table.sql'), 'utf8');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await pool.query(stmt);
      console.log('✅ Executed:', stmt.substring(0, 60).replace(/\n/g, ' '));
    }
    console.log('✅ Migration completed');
    const r = await pool.query('SELECT COUNT(*) FROM contact_messages');
    console.log('📊 contact_messages count:', r.rows[0].count);
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await pool.end();
  }
}
migrate();
