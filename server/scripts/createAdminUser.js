const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Creating admin user...');
    
    // Check if admin user already exists
    const checkUser = await client.query(
      'SELECT * FROM users WHERE email = $1',
      ['admin@laptopstore.com']
    );
    
    if (checkUser.rows.length > 0) {
      console.log('⚠️  Admin user already exists. Updating password and role...');
      
      // Update existing admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await client.query(
        `UPDATE users 
         SET password = $1, role = 'admin', full_name = 'Administrator' 
         WHERE email = $2`,
        [hashedPassword, 'admin@laptopstore.com']
      );
      
      console.log('✅ Admin user updated successfully!');
      
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await client.query(
        `INSERT INTO users (email, password, full_name, phone, address, role) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'admin@laptopstore.com',
          hashedPassword,
          'Administrator',
          '0123456789',
          'Admin Office',
          'admin'
        ]
      );
      
      console.log('✅ Admin user created successfully!');
    }
    
    console.log('');
    console.log('='.repeat(50));
    console.log('📧 Email: admin@laptopstore.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: admin');
    console.log('='.repeat(50));
    console.log('');
    console.log('💡 You can now login at: http://localhost:5173/login');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
