// Script: Drop invalid unique index on coupon_usage table
// Lý do: idx_coupon_usage_coupon_user UNIQUE (coupon_id, user_id) đang conflict
// với logic usage_per_user (1 user dùng 1 mã nhiều lần trên các đơn khác nhau)
// Index giữ lại: coupon_usage_coupon_id_user_id_order_id_key UNIQUE (coupon_id, user_id, order_id)
const { pool } = require('./config/database');

(async () => {
  try {
    // 1. Check if index exists
    const before = await pool.query(
      "SELECT indexname FROM pg_indexes WHERE tablename='coupon_usage'"
    );
    console.log('Indexes BEFORE:');
    console.table(before.rows);

    // 2. Drop the problematic 2-column unique index
    await pool.query('DROP INDEX IF EXISTS public.idx_coupon_usage_coupon_user');
    console.log('✅ Dropped index idx_coupon_usage_coupon_user');

    // 3. Verify
    const after = await pool.query(
      "SELECT indexname, indexdef FROM pg_indexes WHERE tablename='coupon_usage' ORDER BY indexname"
    );
    console.log('\nIndexes AFTER:');
    console.table(after.rows);

    await pool.end();
  } catch (e) {
    console.error('ERR:', e.message, e.code);
    process.exit(1);
  }
})();
