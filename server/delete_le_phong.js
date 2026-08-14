const { pool } = require('./config/database');

(async () => {
  try {
    const term = '%Phong%';
    
    // Find orders
    const orders = await pool.query(`
      SELECT id
      FROM orders
      WHERE recipient_name ILIKE $1 OR email ILIKE $1
    `, [term]);
    
    if (orders.rows.length > 0) {
      const orderIds = orders.rows.map(o => o.id);
      
      console.log('Deleting payment requests...');
      await pool.query(`DELETE FROM payment_requests WHERE order_id = ANY($1)`, [orderIds]);
      
      console.log('Deleting order items...');
      await pool.query(`DELETE FROM order_items WHERE order_id = ANY($1)`, [orderIds]);
      
      try {
        await pool.query(`DELETE FROM order_history WHERE order_id = ANY($1)`, [orderIds]);
        console.log('Deleted order_history');
      } catch(e) {
        // ignore
      }
      
      console.log('Deleting orders...');
      await pool.query(`DELETE FROM orders WHERE id = ANY($1)`, [orderIds]);
      
      console.log('Deleted orders and associated payments for Le Phong');
    } else {
      console.log('No orders found for Le Phong');
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
