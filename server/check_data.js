const { pool } = require('./config/database');

async function checkData() {
  console.log('📋 Checking coupons table...\n');
  
  try {
    const coupons = await pool.query(`
      SELECT id, code, is_active, valid_from, valid_to, used_count, max_uses, min_order_amount
      FROM coupons 
      ORDER BY id
    `);
    
    console.log('Coupons in DB:');
    console.table(coupons.rows);
    
    // Check coupon_usage
    const usage = await pool.query(`
      SELECT cu.*, c.code as coupon_code 
      FROM coupon_usage cu
      LEFT JOIN coupons c ON cu.coupon_id = c.id
      LIMIT 20
    `);
    
    console.log('\nCoupon usage records:', usage.rows.length);
    if (usage.rows.length > 0) {
      console.table(usage.rows);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkData();
