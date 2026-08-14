require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { pool } = require('./config/database');

(async () => {
  try {
    const r = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' AND column_name IN ('role','id');`);
    console.log('USERS:', r.rows);
    const n = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='notifications';`);
    console.log('NOTIFICATIONS:');
    n.rows.forEach(c => console.log(' ', c.column_name, c.data_type));
  } catch (e) {
    console.error('err:', e.message);
  } finally {
    await pool.end();
  }
})();