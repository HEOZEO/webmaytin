const { pool } = require('./config/database');

(async () => {
  try {
    const res = await pool.query('DELETE FROM payment_requests WHERE order_id NOT IN (SELECT id FROM orders)');
    console.log('Deleted ' + res.rowCount + ' orphaned payment requests');
    
    // Check if any payment records are orphaned too
    const payRes = await pool.query('DELETE FROM payments WHERE order_id NOT IN (SELECT id FROM orders)');
    console.log('Deleted ' + payRes.rowCount + ' orphaned payments');
    
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
