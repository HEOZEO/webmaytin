const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

async function testLogin() {
  try {
    console.log('Testing login...\n');

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['admin@gmail.com']
    );

    if (result.rows.length === 0) {
      console.log('❌ No user found with email: admin@gmail.com');
      await pool.end();
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('User found:', { id: user.id, email: user.email, username: user.username, role: user.role, is_active: user.is_active });
    console.log('Password in DB (first 20 chars):', user.password.substring(0, 20) + '...');

    const isMatch = await bcrypt.compare('Admin123@', user.password);
    console.log('\nPassword match:', isMatch);

    if (isMatch) {
      console.log('\n✅ Login test PASSED!');
    } else {
      console.log('\n❌ Password does NOT match!');
      console.log('Let me re-hash and update the password...');

      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash('Admin123@', salt);
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, user.id]);
      console.log('✅ Password updated!');

      const verify = await bcrypt.compare('Admin123@', hashed);
      console.log('Verification:', verify);
    }

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    await pool.end();
    process.exit(1);
  }
}

testLogin();
