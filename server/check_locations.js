const { pool } = require('./config/database');

async function checkLocations() {
  console.log('📋 Checking locations...\n');
  
  try {
    const districts = await pool.query(`SELECT id, name, zone, shipping_fee FROM districts ORDER BY id`);
    console.log('Districts:', districts.rows.length);
    console.table(districts.rows.slice(0, 3));
    
    const wards = await pool.query(`SELECT id, name, district_id FROM wards ORDER BY id LIMIT 5`);
    console.log('\nSample wards:');
    console.table(wards.rows);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkLocations();
