const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration(filename) {
  try {
    console.log(`📄 Running migration: ${filename}`);
    const filePath = path.join(__dirname, '../migrations', filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log(`✅ Migration completed: ${filename}`);
  } catch (error) {
    console.error(`❌ Error running migration ${filename}:`, error.message);
    throw error;
  }
}

async function setupAdminPanel() {
  try {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('  🚀 ADMIN PANEL SETUP');
    console.log('═══════════════════════════════════════');
    console.log('');

    // Run migrations in order
    console.log('📦 Step 1: Running migrations...');
    await runMigration('add_admin_tables.sql');
    await runMigration('add_contact_and_notifications.sql');
    console.log('');

    // Seed data
    console.log('📦 Step 2: Seeding sample data...');
    const { seedContactAndNotifications } = require('../seeders/seedContactAndNotifications');
    await seedContactAndNotifications();
    console.log('');

    console.log('═══════════════════════════════════════');
    console.log('  ✅ ADMIN PANEL SETUP COMPLETED!');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('📋 What was created:');
    console.log('   ✓ contact_messages table');
    console.log('   ✓ notifications table');
    console.log('   ✓ Sample contact messages (5)');
    console.log('   ✓ Sample notifications (8)');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Start the client: cd ../client && npm run dev');
    console.log('   3. Login as admin and test the new features');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════');
    console.error('  ❌ SETUP FAILED');
    console.error('═══════════════════════════════════════');
    console.error('Error:', error.message);
    console.error('');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup
setupAdminPanel();
