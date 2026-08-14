// Run migration for otp_codes table
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../migrations/add_otp_codes_table.sql'),
    'utf8'
  );

  try {
    await pool.query(sql);
    console.log('✅ Migration completed: otp_codes table created');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
