const { pool } = require('./config/database');

(async () => {
  const r = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'coupons' 
    ORDER BY ordinal_position
  `);
  console.log('Coupons table structure:');
  console.log(JSON.stringify(r.rows, null, 2));
  
  const data = await pool.query('SELECT * FROM coupons LIMIT 5');
  console.log('\nSample coupons:');
  console.log(JSON.stringify(data.rows, null, 2));
  
  await pool.end();
})();
