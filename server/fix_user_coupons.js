const { pool } = require('./config/database');

(async () => {
  try {
    // Check coupons
    const coupons = await pool.query('SELECT id, code, is_active FROM coupons ORDER BY id DESC');
    console.log('Coupons:', coupons.rows);

    // Check users
    const users = await pool.query('SELECT id, email, role FROM users');
    console.log('\nUsers:', users.rows);

    // Check user_coupons
    const userCoupons = await pool.query('SELECT COUNT(*) as count FROM user_coupons');
    console.log('\nUser coupons count:', userCoupons.rows[0].count);

    // Fix: Assign existing coupons to all users
    if (coupons.rows.length > 0) {
      console.log('\n--- Assigning coupons to users ---');
      for (const coupon of coupons.rows) {
        const result = await pool.query(`
          INSERT INTO user_coupons (user_id, coupon_id, assigned_at, expires_at, is_used)
          SELECT u.id, $1::int, NOW(), c.valid_to::timestamptz, false
          FROM users u
          CROSS JOIN coupons c
          WHERE c.id = $1
          ON CONFLICT (user_id, coupon_id) DO NOTHING
          RETURNING user_id
        `, [coupon.id]);
        console.log(`Coupon ${coupon.code} (ID ${coupon.id}): assigned to ${result.rowCount} users`);
      }
    }

    // Verify
    const verify = await pool.query('SELECT COUNT(*) as count FROM user_coupons');
    console.log('\nUser coupons after fix:', verify.rows[0].count);

    await pool.end();
    console.log('\n✅ Done!');
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
  }
})();
