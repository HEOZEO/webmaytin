const { pool } = require('../config/database');

async function inspect() {
  const queries = [
    "SELECT column_name FROM information_schema.columns WHERE table_name='products' ORDER BY ordinal_position",
    "SELECT column_name FROM information_schema.columns WHERE table_name='inventory_transactions' ORDER BY ordinal_position",
    "SELECT column_name FROM information_schema.columns WHERE table_name='orders' ORDER BY ordinal_position",
    "SELECT column_name FROM information_schema.columns WHERE table_name='coupons' ORDER BY ordinal_position",
    "SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position",
    "SELECT COUNT(*) FROM products",
    "SELECT id, name, sku FROM products LIMIT 3"
  ];
  for (const q of queries) {
    const r = await pool.query(q);
    console.log('---', q.split('\n')[0].slice(0, 60));
    if (q.includes('SELECT id, name')) {
      r.rows.forEach(row => console.log(row));
    } else {
      console.log(r.rows.length, 'rows');
      if (q.includes('column_name')) console.log(r.rows.map(x => x.column_name).join(', '));
    }
  }
  await pool.end();
}
inspect().catch(e => { console.error(e.message); process.exit(1); });