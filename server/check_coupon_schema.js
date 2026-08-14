const { pool } = require('./config/database');

(async () => {
  try {
    const r = await pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename='coupon_usage' ORDER BY indexname");
    console.log('Indexes on coupon_usage:');
    console.log(JSON.stringify(r.rows, null, 2));

    const c = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='coupon_usage' ORDER BY ordinal_position");
    console.log('\nColumns:');
    console.log(JSON.stringify(c.rows, null, 2));

    const sample = await pool.query("SELECT * FROM coupon_usage LIMIT 5");
    console.log('\nSample rows:');
    console.log(JSON.stringify(sample.rows, null, 2));

    await pool.end();
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  }
})();
