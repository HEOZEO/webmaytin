// Verify: Insert coupon_usage với cùng (coupon_id, user_id) nhưng order_id khác
// → Sau khi drop index, KHÔNG được fail
const { pool } = require('./config/database');

(async () => {
  try {
    // Check existing rows for user 22
    const before = await pool.query(
      "SELECT id, coupon_id, user_id, order_id FROM coupon_usage WHERE user_id = 22 ORDER BY coupon_id, order_id"
    );
    console.log('Before:', before.rows);

    // Try INSERT with same (coupon_id=1, user_id=22) but order_id=9999 (fake)
    // Sẽ fail vì foreign key order_id=9999 không tồn tại
    // → thử với order_id thật (giả sử 1)
    const testOrder = await pool.query("SELECT id, user_id FROM orders WHERE user_id = 22 ORDER BY id LIMIT 3");
    console.log('\nUser 22 orders:', testOrder.rows);

    // Thử insert giả với order_id = ID thật (vẫn test được) - giả lập order_id=1
    const realOrderId = testOrder.rows[0]?.id;
    if (!realOrderId) {
      console.log('No orders for user 22');
      await pool.end();
      return;
    }

    // Insert thử với coupon_id khác (coupon_id=2), user_id=22, order_id mới
    // (coupon_id=2, user_id=22) đã có ở order_id=4. Nếu drop index 2 cột OK
    // → INSERT (2, 22, ord_mới) chỉ fail nếu (2, 22, ord_mới) trùng với row cũ
    console.log('\nTrying INSERT (coupon_id=2, user_id=22, order_id=1)...');
    try {
      const r = await pool.query(
        `INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount)
         VALUES (2, 22, 1, 1000)
         ON CONFLICT (coupon_id, user_id, order_id) DO NOTHING
         RETURNING id`
      );
      console.log('Insert result:', r.rows);
    } catch (e) {
      console.log('❌ FAIL:', e.message);
    }

    // Cleanup
    await pool.query("DELETE FROM coupon_usage WHERE order_id = 1 AND coupon_id = 2 AND user_id = 22");
    console.log('\n✅ Cleanup done');

    await pool.end();
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  }
})();
