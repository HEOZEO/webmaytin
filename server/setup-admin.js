const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

async function setupAdmin() {
  try {
    console.log('🔧 Setting up admin account...');

    // Check if admin exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@gmail.com']);
    
    if (existing.rows.length > 0) {
      // Update existing admin password
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash('Admin123@', salt);
      await pool.query(
        'UPDATE users SET password = $1, full_name = $2, phone = $3, address = $4, is_active = true, role = $5 WHERE email = $6',
        [hashed, 'Administrator', '0912345678', 'TP. Hồ Chí Minh', 'admin', 'admin@gmail.com']
      );
      console.log('✅ Admin password updated successfully!');
    } else {
      // Create new admin
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash('Admin123@', salt);
      await pool.query(
        `INSERT INTO users (email, username, password, full_name, phone, address, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['admin@gmail.com', 'admin', hashed, 'Administrator', '0912345678', 'TP. Hồ Chí Minh', 'admin', true]
      );
      console.log('✅ Admin account created successfully!');
    }

    // Verify
    const verify = await pool.query(
      'SELECT id, email, username, role, is_active FROM users WHERE email = $1',
      ['admin@gmail.com']
    );
    console.log('\n📋 Admin account details:');
    console.log(JSON.stringify(verify.rows[0], null, 2));

    console.log('\n🎉 Login credentials:');
    console.log('   Email: admin@gmail.com');
    console.log('   Username: admin');
    console.log('   Password: Admin123@');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

setupAdmin();
