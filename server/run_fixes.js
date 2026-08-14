const { pool } = require('./config/database');

async function runFixes() {
  console.log('🔧 Running database fixes...\n');

  try {
    // 1. Add updated_at to coupons
    try {
      await pool.query(`
        ALTER TABLE coupons ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log('✅ Added updated_at column to coupons');
    } catch (e) {
      if (e.code === '42701') console.log('ℹ️  updated_at column already exists in coupons');
      else console.log('⚠️  Error:', e.message);
    }

    // 2. Add created_at to coupons if missing
    try {
      await pool.query(`
        ALTER TABLE coupons ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log('✅ Added created_at column to coupons');
    } catch (e) {
      if (e.code === '42701') console.log('ℹ️  created_at column already exists in coupons');
      else console.log('⚠️  Error:', e.message);
    }

    // 3. Check coupons table structure
    const couponCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'coupons' 
      ORDER BY ordinal_position;
    `);
    console.log('\n📋 Coupons columns:', couponCols.rows.map(r => r.column_name).join(', '));

    // 4. Check addresses table structure
    const addrCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'addresses' 
      ORDER BY ordinal_position;
    `);
    console.log('📋 Addresses columns:', addrCols.rows.map(r => r.column_name).join(', '));

    console.log('\n🎉 All fixes completed!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

runFixes();
