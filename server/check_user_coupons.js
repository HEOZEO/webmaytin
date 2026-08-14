const { pool } = require('./config/database');

(async () => {
  // Check user_coupons table
  const uc = await pool.query(`
    SELECT uc.*, c.code 
    FROM user_coupons uc 
    JOIN coupons c ON c.id = uc.coupon_id 
    ORDER BY uc.assigned_at DESC 
    LIMIT 10
  `);
  console.log('User coupons (last 10):');
  console.log(JSON.stringify(uc.rows, null, 2));

  // Check if there are any users
  const users = await pool.query('SELECT id, email, role FROM users LIMIT 5');
  console.log('\nUsers:');
  console.log(JSON.stringify(users.rows, null, 2));

  await pool.end();
})();
