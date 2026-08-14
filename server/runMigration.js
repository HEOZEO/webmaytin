/**
 * Script chạy migration SQL.
 * Sử dụng: node runMigration.js <path-to-sql-file>
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

(async () => {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: node runMigration.js <path-to-sql-file>');
    process.exit(1);
  }

  const fullPath = path.isAbsolute(sqlFile) ? sqlFile : path.join(__dirname, sqlFile);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(fullPath, 'utf8');

  try {
    console.log(`▶ Running migration: ${path.basename(fullPath)}`);
    await pool.query(sql);
    console.log('✅ Migration completed');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();