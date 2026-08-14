const { pool } = require('./config/database');

async function testAPI() {
  console.log('🧪 Testing address API logic...\n');
  
  try {
    // Simulate createAddress logic
    const district_id = 2;
    const ward_id = 32;
    const user_id = 20;
    
    // Check district
    const districtCheck = await pool.query(
      'SELECT id, name FROM districts WHERE id = $1',
      [district_id]
    );
    console.log('District check:', districtCheck.rows[0]);
    
    // Check ward
    const wardCheck = await pool.query(
      'SELECT id, name, district_id FROM wards WHERE id = $1 AND district_id = $2',
      [ward_id, district_id]
    );
    console.log('Ward check:', wardCheck.rows[0]);
    
    // Insert test (with unique phone per test)
    const result = await pool.query(`
      INSERT INTO addresses (user_id, full_name, phone, address, city, district, ward, district_id, ward_id, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [user_id, 'Test User', '0123456789', '123 Test St', 'TP. Huế', 
        districtCheck.rows[0].name, wardCheck.rows[0].name, 
        district_id, ward_id, false]);
    
    console.log('\n✅ Insert successful:', result.rows[0].id);
    
    // Clean up test record
    await pool.query('DELETE FROM addresses WHERE id = $1', [result.rows[0].id]);
    console.log('🧹 Test record cleaned up');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

testAPI();
