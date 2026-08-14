require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../config/database');

async function inspect() {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `);

  console.log('Users table schema:');
  result.rows.forEach(r => {
    console.log(`  ${r.column_name}: ${r.data_type} NULL=${r.is_nullable} DEFAULT=${r.column_default}`);
  });

  await pool.end();
}

inspect();
