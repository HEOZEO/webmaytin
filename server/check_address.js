const { pool } = require('./config/database');

async function checkAddresses() {
  console.log('📋 Checking addresses table...\n');
  
  try {
    const addresses = await pool.query(`
      SELECT a.*, d.name as district_name, w.name as ward_name
      FROM addresses a
      LEFT JOIN districts d ON a.district_id = d.id
      LEFT JOIN wards w ON a.ward_id = w.id
      ORDER BY a.id DESC
      LIMIT 10
    `);
    
    console.log('Addresses in DB:');
    console.table(addresses.rows);
    
    // Check districts and wards
    const districts = await pool.query(`SELECT id, name FROM districts LIMIT 5`);
    console.log('\nSample districts:');
    console.table(districts.rows);
    
    const wards = await pool.query(`SELECT id, name, district_id FROM wards LIMIT 5`);
    console.log('\nSample wards:');
    console.table(wards.rows);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkAddresses();
