const { pool } = require('../config/database');

async function seedContactAndNotifications() {
  try {
    console.log('🌱 Seeding contact messages and notifications...');

    // Get admin users
    const adminsResult = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 5");
    const adminIds = adminsResult.rows.map(row => row.id);

    if (adminIds.length === 0) {
      console.log('⚠️  No admin users found. Creating default admin...');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const adminResult = await pool.query(
        `INSERT INTO users (email, password, full_name, role) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['admin@laptopluxe.com', hashedPassword, 'Admin User', 'admin']
      );
      adminIds.push(adminResult.rows[0].id);
    }

    // Sample contact messages
    const contactMessages = [
      {
        name: 'Nguyễn Văn An',
        email: 'nguyenvanan@gmail.com',
        phone: '0912345678',
        message: 'Tôi muốn hỏi về chính sách bảo hành của laptop Dell XPS 13. Bảo hành bao lâu và có bảo hành quốc tế không?',
        status: 'unread'
      },
      {
        name: 'Trần Thị Bình',
        email: 'tranthib@yahoo.com',
        phone: '0987654321',
        message: 'Laptop MacBook Pro M2 còn hàng không ạ? Tôi muốn đặt mua 2 chiếc cho công ty.',
        status: 'read'
      },
      {
        name: 'Lê Hoàng Cường',
        email: 'lehoangcuong@outlook.com',
        phone: '0909123456',
        message: 'Shop có hỗ trợ trả góp 0% không? Tôi muốn mua laptop gaming ROG Strix.',
        status: 'replied'
      },
      {
        name: 'Phạm Thu Dung',
        email: 'phamthudung@hotmail.com',
        phone: '0976543210',
        message: 'Tôi đã đặt hàng mã #ORD-12345 nhưng chưa nhận được email xác nhận. Vui lòng kiểm tra giúp tôi.',
        status: 'unread'
      },
      {
        name: 'Hoàng Minh Đức',
        email: 'hoangminhduc@gmail.com',
        phone: '0938765432',
        message: 'Shop có chương trình khuyến mãi nào trong tháng này không? Tôi đang quan tâm laptop Asus ZenBook.',
        status: 'read'
      }
    ];

    for (const msg of contactMessages) {
      await pool.query(
        `INSERT INTO contact_messages (name, email, phone, message, status) 
         VALUES ($1, $2, $3, $4, $5)`,
        [msg.name, msg.email, msg.phone, msg.message, msg.status]
      );
    }

    console.log('✅ Contact messages seeded successfully');

    // Sample notifications for admins
    const notificationTypes = ['info', 'warning', 'error', 'success'];
    const notifications = [
      {
        title: 'Đơn hàng mới #ORD-12345',
        message: 'Khách hàng Nguyễn Văn An vừa đặt đơn hàng trị giá 25.990.000₫',
        type: 'success',
        link: '/admin/orders'
      },
      {
        title: 'Sản phẩm tồn kho thấp',
        message: 'Dell XPS 13 9320 chỉ còn 3 sản phẩm trong kho',
        type: 'warning',
        link: '/admin/products'
      },
      {
        title: 'Tin nhắn liên hệ mới',
        message: 'Khách hàng Trần Thị Bình vừa gửi tin nhắn liên hệ',
        type: 'info',
        link: '/admin/contact-messages'
      },
      {
        title: 'Đơn hàng đã giao thành công',
        message: 'Đơn hàng #ORD-12340 đã được giao thành công',
        type: 'success',
        link: '/admin/orders'
      },
      {
        title: 'Cảnh báo tồn kho',
        message: '5 sản phẩm có tồn kho dưới 5. Vui lòng nhập thêm hàng.',
        type: 'error',
        link: '/admin/products'
      },
      {
        title: 'Khách hàng mới đăng ký',
        message: 'Lê Hoàng Cường vừa đăng ký tài khoản mới',
        type: 'info',
        link: '/admin/users'
      },
      {
        title: 'Doanh thu vượt mục tiêu',
        message: 'Doanh thu tháng này đã đạt 150% mục tiêu đề ra',
        type: 'success',
        link: '/admin/analytics'
      },
      {
        title: 'Yêu cầu hoàn tiền',
        message: 'Khách hàng Phạm Thu Dung yêu cầu hoàn tiền đơn #ORD-12338',
        type: 'warning',
        link: '/admin/orders'
      }
    ];

    for (const notif of notifications) {
      // Assign notification to random admin
      const randomAdminId = adminIds[Math.floor(Math.random() * adminIds.length)];
      const isRead = Math.random() > 0.5;

      await pool.query(
        `INSERT INTO notifications (admin_id, title, message, type, link, is_read) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [randomAdminId, notif.title, notif.message, notif.type, notif.link, isRead]
      );
    }

    console.log('✅ Notifications seeded successfully');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Contact messages: ${contactMessages.length}`);
    console.log(`   - Notifications: ${notifications.length}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedContactAndNotifications()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedContactAndNotifications };
