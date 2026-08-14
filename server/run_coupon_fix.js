const { pool } = require('./config/database');

async function runMigration() {
  console.log('🔧 Running coupon_usage fixes...\n');

  try {
    // 1. Add discount_amount column
    try {
      await pool.query(`
        ALTER TABLE coupon_usage ADD COLUMN discount_amount NUMERIC(15,2);
      `);
      console.log('✅ Added discount_amount column');
    } catch (e) {
      if (e.code === '42701') console.log('ℹ️  discount_amount column already exists');
      else console.log('⚠️  Error adding discount_amount:', e.message);
    }

    // 2. Ensure coupon_id is NOT NULL
    try {
      await pool.query(`
        UPDATE coupon_usage SET coupon_id = 0 WHERE coupon_id IS NULL;
      `);
      await pool.query(`
        ALTER TABLE coupon_usage ALTER COLUMN coupon_id SET NOT NULL;
      `);
      console.log('✅ Set coupon_id NOT NULL');
    } catch (e) {
      if (e.code === '42710') console.log('ℹ️  coupon_id already NOT NULL');
      else console.log('⚠️  Error setting coupon_id:', e.message);
    }

    // 3. Ensure user_id is NOT NULL
    try {
      await pool.query(`
        UPDATE coupon_usage SET user_id = 0 WHERE user_id IS NULL;
      `);
      await pool.query(`
        ALTER TABLE coupon_usage ALTER COLUMN user_id SET NOT NULL;
      `);
      console.log('✅ Set user_id NOT NULL');
    } catch (e) {
      if (e.code === '42710') console.log('ℹ️  user_id already NOT NULL');
      else console.log('⚠️  Error setting user_id:', e.message);
    }

    // 4. Create unique index
    try {
      await pool.query(`
        CREATE UNIQUE INDEX idx_coupon_usage_coupon_user 
        ON coupon_usage(coupon_id, user_id);
      `);
      console.log('✅ Created index idx_coupon_usage_coupon_user');
    } catch (e) {
      if (e.code === '42P07') console.log('ℹ️  Index idx_coupon_usage_coupon_user already exists');
      else console.log('⚠️  Error creating index:', e.message);
    }

    console.log('\n🎉 Migration completed!');
    
    // Show current table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'coupon_usage' 
      ORDER BY ordinal_position;
    `);
    console.log('\n📋 Current coupon_usage columns:');
    console.table(result.rows);

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
