require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../migrations/allow_null_username.sql'),
    'utf8'
  );
  try {
    await pool.query(sql);
    console.log('✅ Done: username can now be NULL');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
