const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function addDeletedAtColumns() {
  try {
    console.log('🔧 Adding deleted_at columns to tables...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_deleted_at_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      await pool.query(statement);
      console.log('✅ Executed:', statement.substring(0, 50) + '...');
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the columns were added
    const tables = ['products', 'categories', 'brands', 'coupons'];
    for (const table of tables) {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = '${table}' AND column_name = 'deleted_at'
      `);
      
      if (result.rows.length > 0) {
        console.log(`✅ Column deleted_at verified in ${table}:`, result.rows[0]);
      } else {
        console.log(`❌ Column deleted_at not found in ${table}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await pool.end();
  }
}

addDeletedAtColumns();