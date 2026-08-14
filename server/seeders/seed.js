const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

// Database schema
const createTables = async () => {
  const client = await pool.connect();
  
  try {
    // Drop tables if exist (in correct order due to foreign keys)
    await client.query('DROP TABLE IF EXISTS email_notifications CASCADE');
    await client.query('DROP TABLE IF EXISTS admin_audit_logs CASCADE');
    await client.query('DROP TABLE IF EXISTS inventory_transactions CASCADE');
    await client.query('DROP TABLE IF EXISTS coupon_usage CASCADE');
    await client.query('DROP TABLE IF EXISTS banners CASCADE');
    await client.query('DROP TABLE IF EXISTS settings CASCADE');
    await client.query('DROP TABLE IF EXISTS view_history CASCADE');
    await client.query('DROP TABLE IF EXISTS wishlist CASCADE');
    await client.query('DROP TABLE IF EXISTS addresses CASCADE');
    await client.query('DROP TABLE IF EXISTS activity_logs CASCADE');
    await client.query('DROP TABLE IF EXISTS reviews CASCADE');
    await client.query('DROP TABLE IF EXISTS order_items CASCADE');
    await client.query('DROP TABLE IF EXISTS cart CASCADE');
    await client.query('DROP TABLE IF EXISTS orders CASCADE');
    await client.query('DROP TABLE IF EXISTS products CASCADE');
    await client.query('DROP TABLE IF EXISTS coupons CASCADE');
    await client.query('DROP TABLE IF EXISTS categories CASCADE');
    await client.query('DROP TABLE IF EXISTS brands CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');

    // Create users table
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        address TEXT NOT NULL,
        role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
        is_active BOOLEAN DEFAULT true,
        reset_token VARCHAR(500),
        reset_token_expire TIMESTAMP,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create brands table
    await client.query(`
      CREATE TABLE brands (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create categories table
    await client.query(`
      CREATE TABLE categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Create coupons table
    await client.query(`
      CREATE TABLE coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
        max_discount DECIMAL(15,2),
        max_uses INTEGER DEFAULT 0,
        used_count INTEGER DEFAULT 0,
        valid_from TIMESTAMP NOT NULL,
        valid_to TIMESTAMP NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create products table
    await client.query(`
      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        cpu VARCHAR(100) NOT NULL,
        ram VARCHAR(50) NOT NULL,
        storage VARCHAR(100) NOT NULL,
        gpu VARCHAR(100) NOT NULL,
        screen_size VARCHAR(20) NOT NULL,
        weight DECIMAL(5,2) NOT NULL,
        battery INTEGER NOT NULL,
        color VARCHAR(50) NOT NULL,
        price DECIMAL(15,2) NOT NULL,
        stock INTEGER DEFAULT 0 CHECK (stock >= 0),
        sold INTEGER DEFAULT 0,
        image_url TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create orders table
    await client.query(`
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        total_amount DECIMAL(15,2) NOT NULL,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        final_amount DECIMAL(15,2) NOT NULL,
        shipping_address TEXT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('COD', 'BANK_TRANSFER')),
        coupon_id INTEGER REFERENCES coupons(id),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'packing', 'shipping', 'delivered', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Create cart table
    await client.query(`
      CREATE TABLE cart (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      )
    `);

    // Create order_items table
    await client.query(`
      CREATE TABLE order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        price DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create reviews table
    await client.query(`
      CREATE TABLE reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      )
    `);

    // Create activity_logs table
    await client.query(`
      CREATE TABLE activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create addresses table
    await client.query(`
      CREATE TABLE addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        district VARCHAR(100) NOT NULL,
        ward VARCHAR(100),
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create wishlist table
    await client.query(`
      CREATE TABLE wishlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      )
    `);

    // Create view_history table
    await client.query(`
      CREATE TABLE view_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ====== NEW ADMIN TABLES ======

    // Settings table
    await client.query(`
      CREATE TABLE settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        data_type VARCHAR(20) DEFAULT 'string',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Banners table
    await client.query(`
      CREATE TABLE banners (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        link VARCHAR(255),
        position VARCHAR(50) DEFAULT 'home',
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Coupon usage tracking
    await client.query(`
      CREATE TABLE coupon_usage (
        id SERIAL PRIMARY KEY,
        coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        discount_applied DECIMAL(15,2),
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(coupon_id, user_id, order_id)
      )
    `);

    // Inventory transactions
    await client.query(`
      CREATE TABLE inventory_transactions (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity_change INTEGER NOT NULL,
        reason VARCHAR(100) NOT NULL,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        previous_stock INTEGER,
        new_stock INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Admin audit logs
    await client.query(`
      CREATE TABLE admin_audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Email notifications
    await client.query(`
      CREATE TABLE email_notifications (
        id SERIAL PRIMARY KEY,
        recipient_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        template_name VARCHAR(100),
        variables JSONB,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
        sent_at TIMESTAMP,
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to users
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
    `);

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50)
    `);

    await client.query(`
      UPDATE users
      SET username = split_part(email, '@', 1)
      WHERE username IS NULL OR username = ''
    `);

    await client.query(`
      UPDATE users
      SET username = 'admin'
      WHERE email = 'admin@gmail.com'
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = 'users' AND indexname = 'users_username_key'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
        END IF;
      END$$;
    `);

    // Create indexes for better performance
    await client.query('CREATE INDEX idx_products_brand ON products(brand_id)');
    await client.query('CREATE INDEX idx_products_category ON products(category_id)');
    await client.query('CREATE INDEX idx_products_price ON products(price)');
    await client.query('CREATE INDEX idx_orders_user ON orders(user_id)');
    await client.query('CREATE INDEX idx_orders_status ON orders(status)');
    await client.query('CREATE INDEX idx_cart_user ON cart(user_id)');
    await client.query('CREATE INDEX idx_reviews_product ON reviews(product_id)');
    await client.query('CREATE INDEX idx_addresses_user ON addresses(user_id)');
    await client.query('CREATE INDEX idx_wishlist_user ON wishlist(user_id)');
    await client.query('CREATE INDEX idx_history_user ON view_history(user_id)');
    
    // New indexes for admin tables
    await client.query('CREATE INDEX idx_coupon_usage_coupon_id ON coupon_usage(coupon_id)');
    await client.query('CREATE INDEX idx_coupon_usage_user_id ON coupon_usage(user_id)');
    await client.query('CREATE INDEX idx_inventory_transactions_product_id ON inventory_transactions(product_id)');
    await client.query('CREATE INDEX idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id)');
    await client.query('CREATE INDEX idx_email_notifications_status ON email_notifications(status)');
    await client.query('CREATE INDEX idx_banners_position ON banners(position)');
    await client.query('CREATE INDEX idx_settings_key ON settings(key)');

    console.log('✅ All tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};
// Seed data
const seedData = async () => {
  const client = await pool.connect();
  
  try {
    // Hash password for users
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    const hashedCustomerPassword = await bcrypt.hash('Customer@123', 10);
    const hashedStaffPassword = await bcrypt.hash('Staff@123', 10);

    // Insert users
    await client.query(`
      INSERT INTO users (email, username, password, full_name, phone, address, role) VALUES
      ('admin@gmail.com', 'admin', $1, 'Quản trị viên', '0123456789', 'Hà Nội, Việt Nam', 'admin'),
      ('staff1@gmail.com', 'staff1', $2, 'Nhân viên 1', '0987654321', 'Hồ Chí Minh, Việt Nam', 'staff'),
      ('staff2@gmail.com', 'staff2', $2, 'Nhân viên 2', '0912345678', 'Đà Nẵng, Việt Nam', 'staff'),
      ('staff3@gmail.com', 'staff3', $2, 'Nhân viên 3', '0934567890', 'Hải Phòng, Việt Nam', 'staff'),
      ('customer1@gmail.com', 'customer1', $3, 'Nguyễn Văn A', '0123987654', 'Hà Nội, Việt Nam', 'customer'),
      ('customer2@gmail.com', 'customer2', $3, 'Trần Thị B', '0987123456', 'Hồ Chí Minh, Việt Nam', 'customer'),
      ('customer3@gmail.com', 'customer3', $3, 'Lê Văn C', '0912789456', 'Đà Nẵng, Việt Nam', 'customer'),
      ('customer4@gmail.com', 'customer4', $3, 'Phạm Thị D', '0934123789', 'Hải Phòng, Việt Nam', 'customer'),
      ('customer5@gmail.com', 'customer5', $3, 'Hoàng Văn E', '0945678123', 'Cần Thơ, Việt Nam', 'customer'),
      ('customer6@gmail.com', 'customer6', $3, 'Vũ Thị F', '0956789123', 'Nha Trang, Việt Nam', 'customer'),
      ('customer7@gmail.com', 'customer7', $3, 'Đặng Văn G', '0967890123', 'Huế, Việt Nam', 'customer'),
      ('customer8@gmail.com', 'customer8', $3, 'Bùi Thị H', '0978901234', 'Quy Nhon, Việt Nam', 'customer'),
      ('customer9@gmail.com', 'customer9', $3, 'Dương Văn I', '0989012345', 'Vũng Tàu, Việt Nam', 'customer'),
      ('customer10@gmail.com', 'customer10', $3, 'Cao Thị K', '0990123456', 'Đà Lạt, Việt Nam', 'customer')
    `, [hashedPassword, hashedStaffPassword, hashedCustomerPassword]);

    // Insert brands
    await client.query(`
      INSERT INTO brands (name, description) VALUES
      ('Dell', 'Thương hiệu máy tính hàng đầu từ Mỹ'),
      ('HP', 'Hewlett-Packard - Thương hiệu công nghệ toàn cầu'),
      ('Lenovo', 'Thương hiệu máy tính từ Trung Quốc'),
      ('Apple', 'Thương hiệu công nghệ cao cấp từ Mỹ'),
      ('Asus', 'Thương hiệu máy tính từ Đài Loan'),
      ('Acer', 'Thương hiệu máy tính đa năng'),
      ('MSI', 'Thương hiệu gaming laptop chuyên nghiệp'),
      ('Gigabyte', 'Thương hiệu laptop & bo mạch chủ gaming'),
      ('Intel', 'Vi xử lý Intel Core, Xeon, Celeron'),
      ('AMD', 'Vi xử lý AMD Ryzen, Athlon'),
      ('NVIDIA', 'Card đồ họa NVIDIA GeForce RTX, GTX'),
      ('Samsung', 'SSD, RAM và linh kiện Samsung'),
      ('Kingston', 'RAM, SSD Kingston chính hãng'),
      ('Corsair', 'RAM, tản nhiệt, PSU Corsair'),
      ('WD', 'Ổ cứng HDD, SSD Western Digital'),
      ('Seagate', 'Ổ cứng HDD, SSD Seagate'),
      ('Crucial', 'RAM, SSD Crucial by Micron'),
      ('G.Skill', 'RAM G.Skill cho gaming & workstation'),
      ('LG', 'Màn hình LG UltraGear, UltraFine'),
      ('Samsung Display', 'Màn hình Samsung Odyssey, ViewFinity'),
      ('AOC', 'Màn hình AOC gaming & văn phòng'),
      ('ViewSonic', 'Màn hình ViewSonic chuyên đồ họa'),
      ('BenQ', 'Màn hình BenQ cho designer & gaming'),
      ('Dell Monitor', 'Màn hình Dell UltraSharp, Alienware'),
      ('Logitech', 'Chuột, bàn phím, tai nghe Logitech'),
      ('Razer', 'Chuột, bàn phím, tai nghe Razer gaming'),
      ('Corsair Gaming', 'Phụ kiện gaming Corsair'),
      ('HyperX', 'Tai nghe, bàn phím, chuột HyperX'),
      ('SteelSeries', 'Phụ kiện gaming SteelSeries'),
      ('Akko', 'Bàn phím cơ Akko'),
      ('Keychron', 'Bàn phím cơ Keychron')
    `);

    // Insert categories
    await client.query(`
      INSERT INTO categories (name, description) VALUES
      ('Văn phòng', 'Laptop dành cho công việc văn phòng'),
      ('Gaming', 'Laptop chuyên game với hiệu năng cao'),
      ('Đồ họa', 'Laptop chuyên đồ họa và thiết kế'),
      ('Sinh viên', 'Laptop phù hợp với sinh viên')
    `);
    // Insert coupons
    await client.query(`
      INSERT INTO coupons (code, discount_percent, max_discount, max_uses, valid_from, valid_to, description) VALUES
      ('WELCOME10', 10, 1000000, 100, '2024-01-01', '2024-12-31', 'Giảm 10% cho khách hàng mới'),
      ('SUMMER20', 20, 2000000, 50, '2024-06-01', '2024-08-31', 'Giảm 20% mùa hè'),
      ('STUDENT15', 15, 1500000, 200, '2024-01-01', '2024-12-31', 'Giảm 15% cho sinh viên'),
      ('FLASH25', 25, 3000000, 20, '2024-07-01', '2024-07-31', 'Flash sale giảm 25%'),
      ('NEWBIE5', 5, 500000, 500, '2024-01-01', '2024-12-31', 'Giảm 5% cho người mới')
    `);

    // Sample laptop products (50 products)
    const laptops = [
      // Dell laptops
      { name: 'Dell Inspiron 3520', brand: 1, category: 1, cpu: 'Intel Core i3-1215U', ram: '8GB', storage: 'SSD 256GB', gpu: 'Intel UHD Graphics', screen: '15.6\"', weight: 1.9, battery: 41, color: 'Đen', price: 12990000, stock: 25, image: 'https://via.placeholder.com/400x300?text=Dell+Inspiron+3520', desc: 'Laptop Dell Inspiron 3520 với thiết kế hiện đại, phù hợp cho công việc văn phòng và học tập.' },
      { name: 'Dell Vostro 3520', brand: 1, category: 4, cpu: 'Intel Core i5-1235U', ram: '8GB', storage: 'SSD 512GB', gpu: 'Intel Iris Xe Graphics', screen: '15.6\"', weight: 1.9, battery: 41, color: 'Xám', price: 16990000, stock: 30, image: 'https://via.placeholder.com/400x300?text=Dell+Vostro+3520', desc: 'Laptop Dell Vostro 3520 dành cho doanh nghiệp với hiệu năng ổn định.' },
      { name: 'Dell XPS 13 9320', brand: 1, category: 3, cpu: 'Intel Core i7-1260P', ram: '16GB', storage: 'SSD 512GB', gpu: 'Intel Iris Xe Graphics', screen: '13.4\"', weight: 1.27, battery: 51, color: 'Bạc', price: 35990000, stock: 15, image: 'https://via.placeholder.com/400x300?text=Dell+XPS+13+9320', desc: 'Laptop Dell XPS 13 9320 cao cấp với màn hình InfinityEdge tuyệt đẹp.' },
      { name: 'Dell Gaming G15 5520', brand: 1, category: 2, cpu: 'Intel Core i5-12500H', ram: '8GB', storage: 'SSD 512GB', gpu: 'RTX 3050', screen: '15.6\"', weight: 2.51, battery: 56, color: 'Đen', price: 23990000, stock: 20, image: 'https://via.placeholder.com/400x300?text=Dell+Gaming+G15+5520', desc: 'Laptop gaming Dell G15 5520 với card đồ họa RTX 3050 mạnh mẽ.' },
      
      // HP laptops
      { name: 'HP Pavilion 15-eg2058TX', brand: 2, category: 1, cpu: 'Intel Core i5-1235U', ram: '8GB', storage: 'SSD 512GB', gpu: 'Intel Iris Xe Graphics', screen: '15.6\"', weight: 1.75, battery: 41, color: 'Vàng Gold', price: 17990000, stock: 28, image: 'https://via.placeholder.com/400x300?text=HP+Pavilion+15', desc: 'HP Pavilion 15 với thiết kế thanh lịch và hiệu năng tốt cho công việc hàng ngày.' },
      { name: 'HP Envy 13-ba1030TU', brand: 2, category: 4, cpu: 'Intel Core i5-1135G7', ram: '8GB', storage: 'SSD 256GB', gpu: 'Intel Iris Xe Graphics', screen: '13.3\"', weight: 1.3, battery: 51, color: 'Bạc', price: 21990000, stock: 22, image: 'https://via.placeholder.com/400x300?text=HP+Envy+13', desc: 'HP Envy 13 siêu mỏng nhẹ với thiết kế cao cấp.' },
      { name: 'HP Omen 16-c0142AX', brand: 2, category: 2, cpu: 'AMD Ryzen 5 5600H', ram: '8GB', storage: 'SSD 512GB', gpu: 'RTX 3060', screen: '16.1\"', weight: 2.3, battery: 70, color: 'Đen', price: 28990000, stock: 18, image: 'https://via.placeholder.com/400x300?text=HP+Omen+16', desc: 'Laptop gaming HP Omen 16 với card RTX 3060 cho trải nghiệm gaming tuyệt vời.' },
      { name: 'HP EliteBook 840 G9', brand: 2, category: 1, cpu: 'Intel Core i7-1265U', ram: '16GB', storage: 'SSD 512GB', gpu: 'Intel Iris Xe Graphics', screen: '14\"', weight: 1.36, battery: 51, color: 'Bạc', price: 32990000, stock: 12, image: 'https://via.placeholder.com/400x300?text=HP+EliteBook+840', desc: 'HP EliteBook 840 G9 doanh nhân cao cấp với bảo mật tốt.' }
    ];
    // Continue with more laptops
    const moreLaptops = [
      // Lenovo laptops
      { name: 'Lenovo ThinkPad E14 Gen 4', brand: 3, category: 1, cpu: 'Intel Core i5-1235U', ram: '8GB', storage: 'SSD 256GB', gpu: 'Intel Iris Xe Graphics', screen: '14\"', weight: 1.64, battery: 45, color: 'Đen', price: 18990000, stock: 25, image: 'https://via.placeholder.com/400x300?text=Lenovo+ThinkPad+E14', desc: 'Lenovo ThinkPad E14 với bàn phím truyền thống tuyệt vời.' },
      { name: 'Lenovo IdeaPad Gaming 3', brand: 3, category: 2, cpu: 'AMD Ryzen 5 5600H', ram: '8GB', storage: 'SSD 512GB', gpu: 'RTX 3050', screen: '15.6\"', weight: 2.25, battery: 45, color: 'Xanh Navy', price: 21990000, stock: 30, image: 'https://via.placeholder.com/400x300?text=Lenovo+IdeaPad+Gaming+3', desc: 'Laptop gaming Lenovo IdeaPad Gaming 3 hiệu năng tốt tầm trung.' },
      { name: 'Lenovo Yoga Slim 7', brand: 3, category: 4, cpu: 'AMD Ryzen 7 5700U', ram: '16GB', storage: 'SSD 512GB', gpu: 'AMD Radeon Graphics', screen: '14\"', weight: 1.4, battery: 61, color: 'Xám', price: 24990000, stock: 20, image: 'https://via.placeholder.com/400x300?text=Lenovo+Yoga+Slim+7', desc: 'Lenovo Yoga Slim 7 mỏng nhẹ với hiệu năng AMD Ryzen mạnh mẽ.' },
      { name: 'Lenovo Legion 5', brand: 3, category: 2, cpu: 'AMD Ryzen 7 5800H', ram: '16GB', storage: 'SSD 512GB', gpu: 'RTX 4060', screen: '15.6\"', weight: 2.4, battery: 60, color: 'Đen', price: 32990000, stock: 15, image: 'https://via.placeholder.com/400x300?text=Lenovo+Legion+5', desc: 'Laptop gaming Lenovo Legion 5 với RTX 4060 cho gaming cao cấp.' },
      
      // Apple laptops
      { name: 'MacBook Air M1 2020', brand: 4, category: 4, cpu: 'Apple M1', ram: '8GB', storage: 'SSD 256GB', gpu: 'Apple M1 GPU', screen: '13.3\"', weight: 1.29, battery: 50, color: 'Vàng Gold', price: 25990000, stock: 20, image: 'https://via.placeholder.com/400x300?text=MacBook+Air+M1', desc: 'MacBook Air M1 với chip Apple M1 hiệu năng vượt trội và thời lượng pin dài.' },
      { name: 'MacBook Air M2 2022', brand: 4, category: 4, cpu: 'Apple M2', ram: '8GB', storage: 'SSD 256GB', gpu: 'Apple M2 GPU', screen: '13.6\"', weight: 1.24, battery: 53, color: 'Midnight', price: 31990000, stock: 18, image: 'https://via.placeholder.com/400x300?text=MacBook+Air+M2', desc: 'MacBook Air M2 mới với thiết kế mỏng nhẹ hơn và chip M2 mạnh mẽ.' },
      { name: 'MacBook Pro 13\" M2', brand: 4, category: 3, cpu: 'Apple M2', ram: '8GB', storage: 'SSD 256GB', gpu: 'Apple M2 GPU', screen: '13.3\"', weight: 1.4, battery: 58, color: 'Space Gray', price: 36990000, stock: 12, image: 'https://via.placeholder.com/400x300?text=MacBook+Pro+13+M2', desc: 'MacBook Pro 13\" M2 dành cho chuyên gia với hiệu năng cao.' },
      { name: 'MacBook Pro 14\" M2 Pro', brand: 4, category: 3, cpu: 'Apple M2 Pro', ram: '16GB', storage: 'SSD 512GB', gpu: 'Apple M2 Pro GPU', screen: '14.2\"', weight: 1.6, battery: 70, color: 'Silver', price: 54990000, stock: 8, image: 'https://via.placeholder.com/400x300?text=MacBook+Pro+14+M2+Pro', desc: 'MacBook Pro 14\" M2 Pro với màn hình Liquid Retina XDR tuyệt đẹp.' }
    ];

    const evenMoreLaptops = [
      // Asus laptops
      { name: 'Asus VivoBook 15 X515', brand: 5, category: 4, cpu: 'Intel Core i3-1115G4', ram: '4GB', storage: 'SSD 256GB', gpu: 'Intel UHD Graphics', screen: '15.6\"', weight: 1.8, battery: 37, color: 'Bạc', price: 11990000, stock: 35, image: 'https://via.placeholder.com/400x300?text=Asus+VivoBook+15', desc: 'Asus VivoBook 15 X515 giá rẻ phù hợp sinh viên và công việc cơ bản.' },
      { name: 'Asus ZenBook 14', brand: 5, category: 1, cpu: 'AMD Ryzen 5 5500U', ram: '8GB', storage: 'SSD 512GB', gpu: 'AMD Radeon Graphics', screen: '14\"', weight: 1.39, battery: 63, color: 'Xanh Pine', price: 19990000, stock: 25, image: 'https://via.placeholder.com/400x300?text=Asus+ZenBook+14', desc: 'Asus ZenBook 14 với thiết kế cao cấp và hiệu năng ổn định.' },
      { name: 'Asus ROG Strix G15', brand: 5, category: 2, cpu: 'AMD Ryzen 7 5800H', ram: '16GB', storage: 'SSD 512GB', gpu: 'RTX 3060', screen: '15.6\"', weight: 2.3, battery: 90, color: 'Đen', price: 29990000, stock: 20, image: 'https://via.placeholder.com/400x300?text=Asus+ROG+Strix+G15', desc: 'Gaming laptop Asus ROG Strix G15 với RGB keyboard và hiệu năng cao.' },
      { name: 'Asus TUF Gaming F15', brand: 5, category: 2, cpu: 'Intel Core i5-11400H', ram: '8GB', storage: 'SSD 512GB', gpu: 'RTX 3050', screen: '15.6\"', weight: 2.3, battery: 48, color: 'Xám Graphite', price: 22990000, stock: 28, image: 'https://via.placeholder.com/400x300?text=Asus+TUF+Gaming+F15', desc: 'Asus TUF Gaming F15 bền bỉ với chuẩn quân đội MIL-STD-810H.' }
    ];
    // Final batch of laptops
    const finalLaptops = [
      // Acer laptops
      { name: 'Acer Aspire 3 A315-58', brand: 6, category: 4, cpu: 'Intel Core i3-1115G4', ram: '4GB', storage: 'SSD 256GB', gpu: 'Intel UHD Graphics', screen: '15.6\"', weight: 1.9, battery: 37, color: 'Đen', price: 10990000, stock: 40, image: 'https://via.placeholder.com/400x300?text=Acer+Aspire+3', desc: 'Acer Aspire 3 A315 giá rẻ phù hợp cho học sinh sinh viên.' },
      { name: 'Acer Swift 3 SF314-512', brand: 6, category: 1, cpu: 'Intel Core i5-1240P', ram: '8GB', storage: 'SSD 512GB', gpu: 'Intel Iris Xe Graphics', screen: '14\"', weight: 1.4, battery: 56, color: 'Xanh Steel', price: 18990000, stock: 25, image: 'https://via.placeholder.com/400x300?text=Acer+Swift+3', desc: 'Acer Swift 3 mỏng nhẹ với hiệu năng Intel thế hệ 12.' },
      { name: 'Acer Nitro 5 AN515-58', brand: 6, category: 2, cpu: 'Intel Core i5-12500H', ram: '8GB', storage: 'SSD 512GB', gpu: 'RTX 4050', screen: '15.6\"', weight: 2.5, battery: 58, color: 'Đen Đỏ', price: 26990000, stock: 22, image: 'https://via.placeholder.com/400x300?text=Acer+Nitro+5', desc: 'Laptop gaming Acer Nitro 5 với RTX 4050 hiệu năng tốt.' },
      { name: 'Acer Predator Helios 300', brand: 6, category: 2, cpu: 'Intel Core i7-12700H', ram: '16GB', storage: 'SSD 512GB', gpu: 'RTX 4060', screen: '15.6\"', weight: 2.6, battery: 59, color: 'Đen', price: 35990000, stock: 15, image: 'https://via.placeholder.com/400x300?text=Acer+Predator+Helios+300', desc: 'Gaming laptop cao cấp Acer Predator Helios 300 với RTX 4060.' },
      
      // MSI laptops
      { name: 'MSI Modern 14 C12M', brand: 7, category: 1, cpu: 'Intel Core i5-1235U', ram: '8GB', storage: 'SSD 512GB', gpu: 'Intel Iris Xe Graphics', screen: '14\"', weight: 1.4, battery: 39, color: 'Xám Carbon', price: 16990000, stock: 20, image: 'https://via.placeholder.com/400x300?text=MSI+Modern+14', desc: 'MSI Modern 14 thiết kế thanh lịch cho doanh nhân.' },
      { name: 'MSI GF63 Thin 11SC', brand: 7, category: 2, cpu: 'Intel Core i5-11400H', ram: '8GB', storage: 'SSD 512GB', gpu: 'GTX 1650', screen: '15.6\"', weight: 1.86, battery: 51, color: 'Đen', price: 19990000, stock: 25, image: 'https://via.placeholder.com/400x300?text=MSI+GF63+Thin', desc: 'MSI GF63 Thin gaming laptop entry-level với GTX 1650.' },
      { name: 'MSI Gaming Katana GF66', brand: 7, category: 2, cpu: 'Intel Core i7-12650H', ram: '16GB', storage: 'SSD 512GB', gpu: 'RTX 3060', screen: '15.6\"', weight: 2.25, battery: 54, color: 'Đen', price: 31990000, stock: 18, image: 'https://via.placeholder.com/400x300?text=MSI+Katana+GF66', desc: 'MSI Gaming Katana GF66 với hiệu năng RTX 3060 mạnh mẽ.' },
      { name: 'MSI GP66 Leopard', brand: 7, category: 2, cpu: 'Intel Core i7-11800H', ram: '16GB', storage: 'SSD 1TB', gpu: 'RTX 4070', screen: '15.6\"', weight: 2.9, battery: 65, color: 'Đen', price: 42990000, stock: 10, image: 'https://via.placeholder.com/400x300?text=MSI+GP66+Leopard', desc: 'MSI GP66 Leopard gaming laptop cao cấp với RTX 4070.' }
    ];

    // Insert all laptops
    for (const laptop of [...laptops, ...moreLaptops, ...evenMoreLaptops, ...finalLaptops]) {
      await client.query(`
        INSERT INTO products (name, brand_id, category_id, cpu, ram, storage, gpu, screen_size, 
                             weight, battery, color, price, stock, image_url, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [laptop.name, laptop.brand, laptop.category, laptop.cpu, laptop.ram, laptop.storage, 
          laptop.gpu, laptop.screen, laptop.weight, laptop.battery, laptop.color, 
          laptop.price, laptop.stock, laptop.image, laptop.desc]);
    }

    // Insert default settings
    await client.query(`
      INSERT INTO settings (key, value, description, data_type) VALUES
      ('store_name', 'LaptopLuxe', 'Store display name', 'string'),
      ('store_logo', '/images/logo.png', 'Logo image URL', 'string'),
      ('store_description', 'Premium Laptop Store - Your trusted source for high-quality laptops', 'Store description', 'string'),
      ('contact_email', 'support@laptopluxe.com', 'Support email address', 'string'),
      ('contact_phone', '+84-123-456-789', 'Support phone number', 'string'),
      ('store_address', 'Hanoi, Vietnam', 'Store address', 'string'),
      ('business_hours', '08:00 - 22:00', 'Business operating hours', 'string'),
      ('shipping_fee_fixed', '50000', 'Fixed shipping fee in VND', 'decimal'),
      ('low_stock_threshold', '10', 'Low stock alert threshold', 'integer'),
      ('max_file_upload_size', '5242880', 'Max file upload size in bytes', 'integer'),
      ('notification_order_confirmed', 'true', 'Send email on order confirmed', 'boolean'),
      ('notification_order_shipped', 'true', 'Send email on order shipped', 'boolean'),
      ('notification_order_delivered', 'true', 'Send email on order delivered', 'boolean')
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Sample data inserted successfully');
    console.log('🔐 Default accounts created:');
    console.log('   Admin: admin@gmail.com / Admin@123');
    console.log('   Staff: staff1@gmail.com / Staff@123 (staff2, staff3)');
    console.log('   Customer: customer1@gmail.com / Customer@123 (customer1-10)');
    
  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
    throw error;
  } finally {
    client.release();
  }
};
// Main execution
const main = async () => {
  try {
    console.log('🔄 Starting database setup...');
    console.log('📊 Database: shopmaytinh');
    
    await createTables();
    await seedData();
    
    console.log('🎉 Database setup completed successfully!');
    console.log('🌐 You can now start the server with: npm run dev');
    
  } catch (error) {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { createTables, seedData };