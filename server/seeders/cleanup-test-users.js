const { pool } = require('../config/database');

async function cleanupTestUsers() {
  const client = await pool.connect();
  try {
    // Xoá user test (không phải admin@laptopstore.com)
    const result = await client.query(
      "DELETE FROM users WHERE email != 'admin@laptopstore.com' RETURNING id, email"
    );
    console.log(`✅ Đã xoá ${result.rows.length} user không phải admin:`);
    result.rows.forEach(u => console.log(`  - ${u.email}`));

    // Liệt kê user còn lại
    const remaining = await client.query("SELECT id, email, role FROM users");
    console.log(`\n📋 Còn lại ${remaining.rows.length} user:`);
    remaining.rows.forEach(u => console.log(`  - ${u.email} (${u.role})`));
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupTestUsers();
