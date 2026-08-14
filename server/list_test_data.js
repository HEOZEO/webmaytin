const { pool } = require('./config/database');

(async () => {
  try {
    const users = await pool.query("SELECT id, email, full_name, role FROM users ORDER BY id LIMIT 10");
    console.log('Users:');
    console.table(users.rows);

    const coupons = await pool.query("SELECT id, code, discount_percent, max_uses, used_count, is_active FROM coupons WHERE is_active = true ORDER BY id LIMIT 10");
    console.log('\nActive coupons:');
    console.table(coupons.rows);

    const products = await pool.query("SELECT id, name, price, stock FROM products WHERE is_active = true AND deleted_at IS NULL ORDER BY id LIMIT 5");
    console.log('\nProducts:');
    console.table(products.rows);

    await pool.end();
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  }
})();
