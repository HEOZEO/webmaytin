/**
 * Cleanup Script - Xóa dữ liệu test, chỉ giữ lại sản phẩm và tài khoản admin
 * Chạy: node scripts/cleanupData.js
 */

const { pool } = require('../config/database');

async function cleanupData() {
  console.log('🧹 Bắt đầu dọn dẹp dữ liệu...\n');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // =====================================================
    // 1. Đếm dữ liệu trước khi xóa
    // =====================================================
    console.log('📊 Dữ liệu trước khi dọn dẹp:');
    
    const countsBefore = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM users WHERE role != 'admin') as non_admin_users,
        (SELECT COUNT(*) FROM notifications) as notifications,
        (SELECT COUNT(*) FROM cart) as cart_items,
        (SELECT COUNT(*) FROM coupon_usage) as coupon_usage,
        (SELECT COUNT(*) FROM activity_logs) as activity_logs,
        (SELECT COUNT(*) FROM products) as products,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_users
    `);
    
    const before = countsBefore.rows[0];
    console.log(`  - Đơn hàng: ${before.orders}`);
    console.log(`  - Users (không tính admin): ${before.non_admin_users}`);
    console.log(`  - Notifications: ${before.notifications}`);
    console.log(`  - Cart items: ${before.cart_items}`);
    console.log(`  - Coupon usage: ${before.coupon_usage}`);
    console.log(`  - Activity logs: ${before.activity_logs}`);
    console.log(`  - Sản phẩm: ${before.products}`);
    console.log(`  - Admin accounts: ${before.admin_users}`);
    console.log('');

    // =====================================================
    // 2. Xóa theo thứ tự để tránh vi phạm foreign key
    // =====================================================
    
    console.log('🗑️  Bắt đầu xóa dữ liệu...');

    // Xóa order_items trước (phụ thuộc orders)
    await client.query('TRUNCATE TABLE order_items RESTART IDENTITY CASCADE');
    console.log('  ✓ Đã xóa order_items');

    // Xóa payment_requests (phụ thuộc orders)
    await client.query('TRUNCATE TABLE payment_requests RESTART IDENTITY CASCADE');
    console.log('  ✓ Đã xóa payment_requests');

    // Xóa notifications
    await client.query('TRUNCATE TABLE notifications RESTART IDENTITY CASCADE');
    console.log('  ✓ Đã xóa notifications');

    // Xóa activity_logs
    await client.query('TRUNCATE TABLE activity_logs RESTART IDENTITY CASCADE');
    console.log('  ✓ Đã xóa activity_logs');

    // Xóa cart
    await client.query('TRUNCATE TABLE cart RESTART IDENTITY CASCADE');
    console.log('  ✓ Đã xóa cart');

    // Xóa coupon_usage
    await client.query('TRUNCATE TABLE coupon_usage RESTART IDENTITY CASCADE');
    console.log('  ✓ Đã xóa coupon_usage');

    // Xóa orders (sau khi đã xóa các bảng phụ thuộc)
    await client.query('TRUNCATE TABLE orders RESTART IDENTITY CASCADE');
    console.log('  ✓ Đã xóa orders');

    // Xóa payments
    await client.query('TRUNCATE TABLE payments RESTART IDENTITY CASCADE');
    console.log('  ✓ Đã xóa payments');

    // Xóa users không phải admin
    const deletedUsers = await client.query(
      'DELETE FROM users WHERE role != $1 RETURNING id, full_name, email',
      ['admin']
    );
    console.log(`  ✓ Đã xóa ${deletedUsers.rowCount} user(s) không phải admin`);

    // Reset coupon used_count về 0
    await client.query('UPDATE coupons SET used_count = 0');
    console.log('  ✓ Đã reset coupon used_count về 0');

    // Reset products sold về 0
    await client.query('UPDATE products SET sold = 0');
    console.log('  ✓ Đã reset products sold về 0');

    await client.query('COMMIT');
    console.log('\n✅ Xóa dữ liệu thành công!\n');

    // =====================================================
    // 3. Kiểm tra dữ liệu sau khi xóa
    // =====================================================
    console.log('📊 Dữ liệu sau khi dọn dẹp:');
    
    const countsAfter = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM users WHERE role != 'admin') as non_admin_users,
        (SELECT COUNT(*) FROM notifications) as notifications,
        (SELECT COUNT(*) FROM cart) as cart_items,
        (SELECT COUNT(*) FROM products) as products,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_users,
        (SELECT COUNT(*) FROM coupons) as coupons
    `);
    
    const after = countsAfter.rows[0];
    console.log(`  - Đơn hàng: ${after.orders}`);
    console.log(`  - Users (không tính admin): ${after.non_admin_users}`);
    console.log(`  - Notifications: ${after.notifications}`);
    console.log(`  - Cart items: ${after.cart_items}`);
    console.log(`  - Sản phẩm: ${after.products}`);
    console.log(`  - Admin accounts: ${after.admin_users}`);
    console.log(`  - Coupons: ${after.coupons}`);

    console.log('\n🎉 Hoàn tất dọn dẹp dữ liệu!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Lỗi khi dọn dẹp dữ liệu:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy script
cleanupData();
