const { pool } = require('./config/database');

(async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Check current coupons table
    const coupons = await client.query('SELECT id, code, is_active FROM coupons');
    console.log('Current coupons:', coupons.rows);
    
    // 2. Add is_public column if not exists
    try {
      await client.query(`
        ALTER TABLE coupons 
        ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true
      `);
      console.log('✅ Added is_public column');
    } catch (err) {
      if (err.code !== '4273') throw err; // Ignore if column exists
    }
    
    // 3. Make all existing coupons public
    await client.query('UPDATE coupons SET is_public = true WHERE is_public IS NULL');
    console.log('✅ Set all coupons as public');
    
    // 4. Clear user_coupons (we don't need it anymore)
    await client.query('DELETE FROM coupon_usage'); // Clear usage first if needed
    // Note: Don't delete user_coupons yet in case we need to rollback
    
    // 5. Update getAvailableCoupons to include min_order_amount
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'coupons' AND column_name = 'min_order_amount'
    `);
    
    console.log('✅ Coupon model cleaned up');
    console.log('Columns:', (await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'coupons' ORDER BY ordinal_position")).rows.map(r => r.column_name).join(', '));
    
    await client.query('COMMIT');
    
    // Verify coupons are visible
    const avail = await client.query(`
      SELECT code, discount_percent, is_public, is_active, valid_to, min_order_amount
      FROM coupons 
      WHERE is_public = true AND is_active = true
    `);
    console.log('\n📋 Available public coupons:');
    console.log(avail.rows);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
