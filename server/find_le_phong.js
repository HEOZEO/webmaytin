const { pool } = require('./config/database');

(async () => {
  try {
    const orders = await pool.query(`
      SELECT o.id, o.user_id, o.status, a.full_name
      FROM orders o
      LEFT JOIN addresses a ON o.shipping_address_id = a.id
      WHERE a.full_name ILIKE '%Lê Phong%' OR a.full_name ILIKE '%Le Phong%'
    `);
    console.log('Orders:', orders.rows);
    
    // Also users
    const users = await pool.query("SELECT * FROM users WHERE full_name ILIKE '%Lê Phong%' OR full_name ILIKE '%Le Phong%'");
    console.log('Users:', users.rows);
    
    // Payment requests
    const payments = await pool.query(`
      SELECT pr.* FROM payment_requests pr
      JOIN orders o ON pr.order_id = o.id
      LEFT JOIN addresses a ON o.shipping_address_id = a.id
      WHERE a.full_name ILIKE '%Lê Phong%' OR a.full_name ILIKE '%Le Phong%'
    `);
    console.log('Payments by order address:', payments.rows);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
