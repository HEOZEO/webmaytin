const { pool } = require('./config/database');

async function checkWard() {
  const result = await pool.query(`
    SELECT w.*, d.name as district_name 
    FROM wards w 
    LEFT JOIN districts d ON w.district_id = d.id 
    WHERE w.id = 32
  `);
  console.log('Ward 32:', result.rows);
  
  // Check all wards for district 2
  const district2Wards = await pool.query(`
    SELECT id, name, district_id FROM wards WHERE district_id = 2
  `);
  console.log('\nAll wards in district 2:');
  console.table(district2Wards.rows);
}

checkWard().then(() => pool.end());
