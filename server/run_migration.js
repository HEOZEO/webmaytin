// Run a SQL migration file using pg against DATABASE_URL
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(async () => {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: node run_migration.js <path-to-sql-file>');
    process.exit(1);
  }
  const absPath = path.isAbsolute(sqlFile) ? sqlFile : path.join(__dirname, sqlFile);
  const sql = fs.readFileSync(absPath, 'utf8');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log(`Running migration: ${path.basename(absPath)}`);
    await client.query(sql);
    console.log('✅ Migration applied successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();