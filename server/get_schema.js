const {pool} = require('./config/database');

async function getTables() {
  const {rows} = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
  for(const {table_name} of rows) {
    console.log('\nTABLE:', table_name);
    const cols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`, [table_name]);
    cols.rows.forEach(c => console.log('  ', c.column_name, c.data_type));
  }
  process.exit(0);
}

getTables().catch(console.error);
