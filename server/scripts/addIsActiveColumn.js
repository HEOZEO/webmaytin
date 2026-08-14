const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function addIsActiveColumn() {
  try {
    console.log('🔧 Adding is_active column to users table...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_is_active_column.sql');
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
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_active'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Column is_active verified:', result.rows[0]);
    } else {
      console.log('❌ Column is_active not found');
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await pool.end();
  }
}

addIsActiveColumn();