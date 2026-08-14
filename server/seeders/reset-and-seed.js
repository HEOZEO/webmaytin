const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

// Database schema - giữ nguyên cấu trúc bảng nhưng chỉ xoá dữ liệu users
const resetUsersAndSeedAdmin = async () => {
  const client = await pool.connect();

  try {
    // Xoá toàn bộ dữ liệu liên quan đến user
    await client.query('BEGIN');

    await client.query('TRUNCATE TABLE cart, addresses, wishlist, view_history, activity_logs, notifications, coupon_usage, admin_audit_logs, inventory_transactions CASCADE');
    await client.query('TRUNCATE TABLE orders, order_items, reviews CASCADE');
    await client.query('DELETE FROM users');

    // Tạo 1 tài khoản admin duy nhất
    const hashedPassword = await bcrypt.hash('Admin123@', 10);
    await client.query(`
      INSERT INTO users (email, password, full_name, phone, address, role)
      VALUES ('admin@laptopstore.com', $1, 'Quản Trị Viên', '0123456789', 'Hà Nội, Việt Nam', 'admin')
    `, [hashedPassword]);

    await client.query('COMMIT');
    console.log('✅ Đã xoá toàn bộ user và tạo tài khoản admin duy nhất');
    console.log('📧 Email: admin@laptopstore.com');
    console.log('🔑 Password: Admin123@');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Seed thêm sản phẩm để có đủ 30 sản phẩm với hình ảnh đầy đủ
const seedExtraProducts = async () => {
  const client = await pool.connect();

  try {
    // Kiểm tra số lượng sản phẩm hiện tại
    const countRes = await client.query('SELECT COUNT(*) FROM products');
    const currentCount = parseInt(countRes.rows[0].count);
    console.log(`📦 Hiện có ${currentCount} sản phẩm`);

    // Danh sách hình ảnh laptop chất lượng cao từ Unsplash
    const LAPTOP_IMAGES = {
      dell: [
        'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1611186711899-3b4656c40e57?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80'
      ],
      hp: [
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80'
      ],
      lenovo: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1593642634524-b40b5baae6bb?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1484788984921-03950022c9ef?auto=format&fit=crop&w=800&q=80'
      ],
      apple: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80'
      ],
      asus: [
        'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1593642634524-b40b5baae6bb?auto=format&fit=crop&w=800&q=80'
      ],
      acer: [
        'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1593642634524-b40b5baae6bb?auto=format&fit=crop&w=800&q=80'
      ],
      msi: [
        'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80'
      ]
    };

    const extraProducts = [
      // Dell thêm
      { name: 'Dell Latitude 5530', brand: 1, category: 1, cpu: 'Intel Core i7-1255U', ram: '16GB', storage: 'SSD 512GB', gpu: 'Intel Iris Xe Graphics', screen: '15.6"', weight: 1.79, battery: 58, color: 'Xám Đậm', price: 28990000, stock: 18, image: LAPTOP_IMAGES.dell[0], desc: 'Dell Latitude 5530 - laptop doanh nhân cao cấp với bảo mật tốt, bàn phím gõ sướng và thời lượng pin ấn tượng cho cả ngày làm việc.' },
      { name: 'Dell Inspiron 16 Plus 7620', brand: 1, category: 3, cpu: 'Intel Core i7-12700H', ram: '16GB', storage: 'SSD 1TB', gpu: 'RTX 3050 Ti', screen: '16"', weight: 2.1, battery: 86, color: 'Bạc Bạch Kim', price: 38990000, stock: 12, image: LAPTOP_IMAGES.dell[1], desc: 'Dell Inspiron 16 Plus 7620 - laptop hiệu năng cao với màn hình 16 inch 3K tuyệt đẹp, lý tưởng cho công việc đồ họa và đa nhiệm.' },

      // HP thêm
      { name: 'HP Victus 16-e0175AX', brand: 2, category: 2, cpu: 'AMD Ryzen 5 5600H', ram: '8GB', storage: 'SSD 512GB', gpu: 'RTX 3050', screen: '16.1"', weight: 2.46, battery: 70, color: 'Đen Mica', price: 22990000, stock: 22, image: LAPTOP_IMAGES.hp[0], desc: 'HP Victus 16 - laptop gaming giá tầm trung với thiết kế hầm hố, hiệu năng chơi game mượt mà ở thiết lập cao.' },
      { name: 'HP Spectre x360 14', brand: 2, category: 4, cpu: 'Intel Core i7-1255U', ram: '16GB', storage: 'SSD 1TB', gpu: 'Intel Iris Xe Graphics', screen: '13.5"', weight: 1.36, battery: 66, color: 'Xanh Đêm', price: 42990000, stock: 10, image: LAPTOP_IMAGES.hp[1], desc: 'HP Spectre x360 14 - laptop 2-in-1 cao cấp với màn hình cảm ứng OLED, thiết kế sang trọng và hiệu năng mạnh mẽ.' },

      // Lenovo thêm
      { name: 'Lenovo ThinkBook 15 Gen 4', brand: 3, category: 1, cpu: 'Intel Core i5-1235U', ram: '8GB', storage: 'SSD 512GB', gpu: 'Intel Iris Xe Graphics', screen: '15.6"', weight: 1.7, battery: 45, color: 'Xám Khoáng', price: 17990000, stock: 28, image: LAPTOP_IMAGES.lenovo[0], desc: 'Lenovo ThinkBook 15 Gen 4 - laptop doanh nghiệp tầm trung với thiết kế hiện đại, bảo mật tốt và hiệu năng ổn định.' },
      { name: 'Lenovo LOQ 16IRH8', brand: 3, category: 2, cpu: 'Intel Core i7-13620H', ram: '16GB', storage: 'SSD 512GB', gpu: 'RTX 4060', screen: '16"', weight: 2.6, battery: 80, color: 'Xám Bão', price: 31990000, stock: 14, image: LAPTOP_IMAGES.lenovo[1], desc: 'Lenovo LOQ 16IRH8 - laptop gaming mới ra mắt với RTX 4060 mạnh mẽ, màn hình 16 inch 165Hz cho trải nghiệm gaming đỉnh cao.' },

      // Apple thêm
      { name: 'MacBook Pro 16" M3 Pro', brand: 4, category: 3, cpu: 'Apple M3 Pro', ram: '18GB', storage: 'SSD 512GB', gpu: 'Apple M3 Pro GPU', screen: '16.2"', weight: 2.14, battery: 100, color: 'Space Black', price: 79990000, stock: 7, image: LAPTOP_IMAGES.apple[0], desc: 'MacBook Pro 16 inch M3 Pro - đỉnh cao laptop chuyên nghiệp với chip M3 Pro 12-core, màn hình Liquid Retina XDR tuyệt đẹp và pin dùng cả ngày.' },
      { name: 'MacBook Air 15" M2', brand: 4, category: 4, cpu: 'Apple M2', ram: '8GB', storage: 'SSD 256GB', gpu: 'Apple M2 GPU', screen: '15.3"', weight: 1.51, battery: 66, color: 'Starlight', price: 37990000, stock: 16, image: LAPTOP_IMAGES.apple[1], desc: 'MacBook Air 15 M2 - laptop mỏng nhẹ với màn hình lớn 15.3 inch, chip M2 mạnh mẽ, hoàn hảo cho công việc sáng tạo và giải trí.' },

      // Asus thêm
      { name: 'Asus ProArt Studiobook 16', brand: 5, category: 3, cpu: 'Intel Core i9-13980HX', ram: '32GB', storage: 'SSD 1TB', gpu: 'RTX 4070', screen: '16"', weight: 2.4, battery: 90, color: 'Đen Sao', price: 65990000, stock: 6, image: LAPTOP_IMAGES.asus[0], desc: 'Asus ProArt Studiobook 16 - laptop đồ họa chuyên nghiệp với màn hình OLED 4K, RAM 32GB và card đồ họa RTX 4070 cho công việc 3D và render.' },
      { name: 'Asus Zenbook Pro 14 OLED', brand: 5, category: 1, cpu: 'Intel Core i7-13700H', ram: '16GB', storage: 'SSD 1TB', gpu: 'RTX 4050', screen: '14.5"', weight: 1.6, battery: 76, color: 'Xám Tech', price: 39990000, stock: 11, image: LAPTOP_IMAGES.asus[1], desc: 'Asus Zenbook Pro 14 OLED - laptop cao cấp với màn hình OLED 2.8K 120Hz tuyệt đẹp, hiệu năng mạnh mẽ và thiết kế sang trọng.' },

      // Acer thêm
      { name: 'Acer Aspire 5 A515-57', brand: 6, category: 1, cpu: 'Intel Core i5-1235U', ram: '8GB', storage: 'SSD 512GB', gpu: 'Intel Iris Xe Graphics', screen: '15.6"', weight: 1.77, battery: 50, color: 'Bạc Ánh Xanh', price: 15990000, stock: 32, image: LAPTOP_IMAGES.acer[0], desc: 'Acer Aspire 5 - laptop văn phòng giá tốt với hiệu năng ổn định, màn hình Full HD và bàn phím gõ thoải mái cho công việc hàng ngày.' },
      { name: 'Acer ConceptD 7 SpatialLabs', brand: 6, category: 3, cpu: 'Intel Core i7-11800H', ram: '32GB', storage: 'SSD 1TB', gpu: 'RTX 3080', screen: '15.6"', weight: 2.5, battery: 84, color: 'Trắng Sứ', price: 79990000, stock: 4, image: LAPTOP_IMAGES.acer[1], desc: 'Acer ConceptD 7 SpatialLabs - laptop công nghệ cao với màn hình 3D không cần kính, dành cho nhà thiết kế và kỹ sư chuyên nghiệp.' },

      // MSI thêm
      { name: 'MSI Stealth 14 AI Studio', brand: 7, category: 3, cpu: 'Intel Core Ultra 7 155H', ram: '32GB', storage: 'SSD 1TB', gpu: 'RTX 4060', screen: '14"', weight: 1.7, battery: 72, color: 'Xám Sao', price: 49990000, stock: 8, image: LAPTOP_IMAGES.msi[0], desc: 'MSI Stealth 14 AI Studio - laptop gaming mỏng nhẹ với chip AI mới nhất, RTX 4060 và màn hình 14 inch 240Hz cho gaming di động đỉnh cao.' },
      { name: 'MSI Creator Z17 HX Studio', brand: 7, category: 3, cpu: 'Intel Core i9-13950HX', ram: '64GB', storage: 'SSD 2TB', gpu: 'RTX 4080', screen: '17"', weight: 2.6, battery: 90, color: 'Đen Lửa', price: 89990000, stock: 5, image: LAPTOP_IMAGES.msi[1], desc: 'MSI Creator Z17 HX Studio - laptop đồ họa đỉnh cao với RAM 64GB, SSD 2TB và RTX 4080, hoàn hảo cho AI/ML và render video chuyên nghiệp.' }
    ];

    for (const p of extraProducts) {
      await client.query(`
        INSERT INTO products (name, brand_id, category_id, cpu, ram, storage, gpu, screen_size,
                              weight, battery, color, price, stock, image_url, description, sold)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [p.name, p.brand, p.category, p.cpu, p.ram, p.storage, p.gpu, p.screen,
          p.weight, p.battery, p.color, p.price, p.stock, p.image, p.desc, Math.floor(Math.random() * 100)]);
    }

    const finalCount = await client.query('SELECT COUNT(*) FROM products');
    console.log(`✅ Đã thêm ${extraProducts.length} sản phẩm mới với hình ảnh đầy đủ`);
    console.log(`📦 Tổng cộng: ${finalCount.rows[0].count} sản phẩm`);
  } catch (error) {
    console.error('❌ Lỗi seed sản phẩm:', error);
    throw error;
  } finally {
    client.release();
  }
};

const main = async () => {
  try {
    console.log('🔄 Bắt đầu cập nhật dữ liệu...');
    await resetUsersAndSeedAdmin();
    await seedExtraProducts();
    console.log('🎉 Hoàn tất!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Lỗi:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { resetUsersAndSeedAdmin, seedExtraProducts };
