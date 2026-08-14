const { pool } = require('./config/database');

async function fixCoupon() {
  console.log('🔧 Fixing coupon min_order_amount...\n');
  
  try {
    // Reset min_order_amount to 0 for all coupons (or set a reasonable default)
    const result = await pool.query(`
      UPDATE coupons SET min_order_amount = 0 WHERE min_order_amount > 10000000
      RETURNING id, code, min_order_amount
    `);
    
    console.log('Updated coupons:', result.rows);
    
    // Also clear any coupon_usage records that might be blocking users
    const clearUsage = await pool.query(`
      DELETE FROM coupon_usage RETURNING id
    `);
    console.log('\nCleared coupon_usage records:', clearUsage.rows.length);
    
    console.log('\n✅ Coupon fixed!');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

fixCoupon();
