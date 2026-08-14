const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

const seedVietnameseData = async () => {
  const client = await pool.connect();

  try {
    console.log('🌱 Bắt đầu tạo dữ liệu tiếng Việt...');

    // Clear existing data
    await client.query('TRUNCATE TABLE products, categories, brands, coupons, banners CASCADE');

    // Create Brands
    const brands = [
      // Laptop / PC brands
      { name: 'Dell', description: 'Máy tính Dell chất lượng cao' },
      { name: 'Asus', description: 'Asus - Công nghệ hàng đầu' },
      { name: 'Acer', description: 'Acer máy tính hiệu năng cao' },
      { name: 'HP', description: 'HP máy tính đáng tin cậy' },
      { name: 'Lenovo', description: 'Lenovo công nghệ thông minh' },
      { name: 'Apple', description: 'Apple MacBook cao cấp' },
      { name: 'MSI', description: 'MSI laptop gaming mạnh mẽ' },
      { name: 'Gigabyte', description: 'Gigabyte máy tính gaming' },
      // CPU / GPU / Component brands
      { name: 'Intel', description: 'Vi xử lý Intel Core, Xeon, Celeron' },
      { name: 'AMD', description: 'Vi xử lý AMD Ryzen, Athlon' },
      { name: 'NVIDIA', description: 'Card đồ họa NVIDIA GeForce RTX, GTX' },
      { name: 'Samsung', description: 'SSD, RAM và linh kiện Samsung' },
      { name: 'Kingston', description: 'RAM, SSD Kingston chính hãng' },
      { name: 'Corsair', description: 'RAM, tản nhiệt, PSU Corsair' },
      { name: 'WD', description: 'Ổ cứng HDD, SSD Western Digital' },
      { name: 'Seagate', description: 'Ổ cứng HDD, SSD Seagate' },
      { name: 'Crucial', description: 'RAM, SSD Crucial by Micron' },
      { name: 'G.Skill', description: 'RAM G.Skill cho gaming & workstation' },
      // Monitor brands
      { name: 'LG', description: 'Màn hình LG UltraGear, UltraFine' },
      { name: 'Samsung Display', description: 'Màn hình Samsung Odyssey, ViewFinity' },
      { name: 'AOC', description: 'Màn hình AOC gaming & văn phòng' },
      { name: 'ViewSonic', description: 'Màn hình ViewSonic chuyên đồ họa' },
      { name: 'BenQ', description: 'Màn hình BenQ cho designer & gaming' },
      { name: 'Dell Monitor', description: 'Màn hình Dell UltraSharp, Alienware' },
      // Accessories brands
      { name: 'Logitech', description: 'Chuột, bàn phím, tai nghe Logitech' },
      { name: 'Razer', description: 'Chuột, bàn phím, tai nghe Razer gaming' },
      { name: 'Corsair Gaming', description: 'Phụ kiện gaming Corsair' },
      { name: 'HyperX', description: 'Tai nghe, bàn phím, chuột HyperX' },
      { name: 'SteelSeries', description: 'Phụ kiện gaming SteelSeries' },
      { name: 'Akko', description: 'Bàn phím cơ Akko' },
      { name: 'Keychron', description: 'Bàn phím cơ Keychron' },
    ];

    const brandResults = [];
    for (const brand of brands) {
      const res = await client.query(
        'INSERT INTO brands (name, description) VALUES ($1, $2) RETURNING id',
        [brand.name, brand.description]
      );
      brandResults.push({ ...brand, id: res.rows[0].id });
    }
    console.log('✅ Thương hiệu đã tạo');

    // Create Categories
    const categories = [
      { name: 'Gaming', description: 'Laptop chuyên game hiệu năng cao' },
      { name: 'Văn phòng', description: 'Laptop đa năng cho công việc' },
      { name: 'Đồ họa', description: 'Laptop chuyên thiết kế và đồ họa' },
      { name: 'Sinh viên', description: 'Laptop giá rẻ cho sinh viên' },
      { name: 'Cao cấp', description: 'Laptop cao cấp thời thượng' },
    ];

    const categoryResults = [];
    for (const cat of categories) {
      const res = await client.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id',
        [cat.name, cat.description]
      );
      categoryResults.push({ ...cat, id: res.rows[0].id });
    }
    console.log('✅ Danh mục đã tạo');

    // Create Products (20 products)
    const products = [
      {
        name: 'Dell XPS 13 2024',
        brand_id: brandResults.find(b => b.name === 'Dell').id,
        category_id: categoryResults.find(c => c.name === 'Cao cấp').id,
        cpu: 'Intel Core i7-1355U',
        ram: '16GB LPDDR5',
        storage: '512GB SSD NVMe',
        gpu: 'Intel Iris Xe Graphics',
        screen_size: '13.4 inch FHD+',
        weight: 1.2,
        battery: 52,
        color: 'Bạc',
        price: 29990000,
        cost_price: 24000000,
        stock: 15,
        image_url: '/images/products/DellXPS139320.jpg',
        description: 'Laptop siêu mỏng cao cấp với hiệu năng tuyệt vời, pin lâu, màn hình sắc nét'
      },
      {
        name: 'Asus ROG Zephyrus G14',
        brand_id: brandResults.find(b => b.name === 'Asus').id,
        category_id: categoryResults.find(c => c.name === 'Gaming').id,
        cpu: 'Intel Core i9-13900HS',
        ram: '32GB LPDDR5',
        storage: '1TB SSD NVMe',
        gpu: 'NVIDIA RTX 4090',
        screen_size: '14 inch 2.8K 120Hz',
        weight: 1.85,
        battery: 80,
        color: 'Đen',
        price: 49990000,
        cost_price: 40000000,
        stock: 8,
        image_url: '/images/products/AsusROGStrixG15.jpg',
        description: 'Laptop gaming cao cấp với card đồ họa mạnh mẽ, màn hình 120Hz smooth'
      },
      {
        name: 'Acer Nitro 5',
        brand_id: brandResults.find(b => b.name === 'Acer').id,
        category_id: categoryResults.find(c => c.name === 'Gaming').id,
        cpu: 'Intel Core i7-12700H',
        ram: '16GB DDR4',
        storage: '512GB SSD',
        gpu: 'NVIDIA RTX 3060',
        screen_size: '15.6 inch FHD 144Hz',
        weight: 2.5,
        battery: 60,
        color: 'Đỏ',
        price: 18990000,
        cost_price: 14500000,
        stock: 20,
        image_url: '/images/products/AcerNitro5AN515-58.jpg',
        description: 'Laptop gaming với giá tốt, hiệu năng ổn định cho chơi game'
      },
      {
        name: 'HP Victus 16',
        brand_id: brandResults.find(b => b.name === 'HP').id,
        category_id: categoryResults.find(c => c.name === 'Gaming').id,
        cpu: 'Intel Core i7-12700H',
        ram: '16GB DDR5',
        storage: '512GB SSD',
        gpu: 'NVIDIA RTX 3080 Ti',
        screen_size: '16 inch FHD 144Hz',
        weight: 2.48,
        battery: 70,
        color: 'Đen',
        price: 32990000,
        cost_price: 26000000,
        stock: 12,
        image_url: '/images/products/HPOmen16-c0142AX.jpg',
        description: 'Laptop gaming 16 inch mạnh mẽ, hiệu năng cao cho gaming'
      },
      {
        name: 'Lenovo ThinkPad X1',
        brand_id: brandResults.find(b => b.name === 'Lenovo').id,
        category_id: categoryResults.find(c => c.name === 'Văn phòng').id,
        cpu: 'Intel Core i7-1365U',
        ram: '16GB LPDDR5',
        storage: '512GB SSD',
        gpu: 'Intel Iris Xe',
        screen_size: '14 inch FHD',
        weight: 1.29,
        battery: 65,
        color: 'Đen',
        price: 27990000,
        cost_price: 21000000,
        stock: 18,
        image_url: '/images/products/LenovoThinkPadE14Gen4.jpg',
        description: 'Laptop doanh nhân đáng tin cậy, bàn phím thoải mái'
      },
      {
        name: 'MacBook Air M2',
        brand_id: brandResults.find(b => b.name === 'Apple').id,
        category_id: categoryResults.find(c => c.name === 'Cao cấp').id,
        cpu: 'Apple M2',
        ram: '8GB Unified Memory',
        storage: '256GB SSD',
        gpu: 'Apple GPU 10-core',
        screen_size: '13.3 inch Retina',
        weight: 1.24,
        battery: 100,
        color: 'Bạc',
        price: 32990000,
        cost_price: 26000000,
        stock: 10,
        image_url: '/images/products/MacBookAirM22022.jpg',
        description: 'MacBook Air M2 hiệu năng tuyệt vời, pin lâu nhất'
      },
      {
        name: 'MSI Raider GE68 HX',
        brand_id: brandResults.find(b => b.name === 'MSI').id,
        category_id: categoryResults.find(c => c.name === 'Gaming').id,
        cpu: 'Intel Core i9-13900HX',
        ram: '32GB DDR5',
        storage: '1TB SSD',
        gpu: 'NVIDIA RTX 4080',
        screen_size: '16 inch QHD 240Hz',
        weight: 2.65,
        battery: 80,
        color: 'Đen',
        price: 54990000,
        cost_price: 43000000,
        stock: 5,
        image_url: '/images/products/MSIGamingKatanaGF66.jpg',
        description: 'Laptop gaming MSI cao cấp, màn hình 240Hz siêu mượt'
      },
      {
        name: 'Asus VivoBook 15',
        brand_id: brandResults.find(b => b.name === 'Asus').id,
        category_id: categoryResults.find(c => c.name === 'Sinh viên').id,
        cpu: 'AMD Ryzen 7 5700U',
        ram: '8GB DDR4',
        storage: '512GB SSD',
        gpu: 'AMD Radeon',
        screen_size: '15.6 inch FHD',
        weight: 1.8,
        battery: 42,
        color: 'Bạc',
        price: 12990000,
        cost_price: 9500000,
        stock: 25,
        image_url: '/images/products/AsusVivoBook15X515.jpg',
        description: 'Laptop rẻ tiền cho sinh viên, hiệu năng đủ dùng'
      },
      {
        name: 'Dell Inspiron 3520',
        brand_id: brandResults.find(b => b.name === 'Dell').id,
        category_id: categoryResults.find(c => c.name === 'Sinh viên').id,
        cpu: 'Intel Core i5-1235U',
        ram: '8GB DDR4',
        storage: '256GB SSD',
        gpu: 'Intel UHD Graphics',
        screen_size: '15.6 inch FHD',
        weight: 1.67,
        battery: 54,
        color: 'Đen',
        price: 11990000,
        cost_price: 8500000,
        stock: 30,
        image_url: '/images/products/DellInspiron3520.jpg',
        description: 'Laptop Dell phổ thông, giá rẻ, đủ dùng'
      },
      {
        name: 'HP Envy 13',
        brand_id: brandResults.find(b => b.name === 'HP').id,
        category_id: categoryResults.find(c => c.name === 'Cao cấp').id,
        cpu: 'Intel Core i7-1360P',
        ram: '16GB LPDDR5',
        storage: '512GB SSD',
        gpu: 'Intel Iris Xe',
        screen_size: '13.3 inch 2.8K OLED',
        weight: 1.32,
        battery: 60,
        color: 'Bạc',
        price: 28990000,
        cost_price: 22000000,
        stock: 14,
        image_url: '/images/products/HPEnvy13-ba1030TU.jpg',
        description: 'Laptop nhỏ gọn cao cấp, màn hình OLED đẹp'
      },
      {
        name: 'Lenovo Legion 5',
        brand_id: brandResults.find(b => b.name === 'Lenovo').id,
        category_id: categoryResults.find(c => c.name === 'Gaming').id,
        cpu: 'AMD Ryzen 7 6800H',
        ram: '16GB DDR5',
        storage: '512GB SSD',
        gpu: 'NVIDIA RTX 3050 Ti',
        screen_size: '16 inch FHD 165Hz',
        weight: 2.4,
        battery: 80,
        color: 'Xanh đen',
        price: 23990000,
        cost_price: 18000000,
        stock: 16,
        image_url: '/images/products/LenovoLegion5.jpg',
        description: 'Laptop gaming Lenovo giá tốt, hiệu năng ổn định'
      },
      {
        name: 'Acer Swift 3',
        brand_id: brandResults.find(b => b.name === 'Acer').id,
        category_id: categoryResults.find(c => c.name === 'Văn phòng').id,
        cpu: 'Intel Core i5-1240P',
        ram: '8GB LPDDR5',
        storage: '512GB SSD',
        gpu: 'Intel Iris Xe',
        screen_size: '14 inch FHD',
        weight: 1.35,
        battery: 50,
        color: 'Xanh',
        price: 14990000,
        cost_price: 11000000,
        stock: 22,
        image_url: '/images/products/AcerSwift3SF314-512.jpg',
        description: 'Laptop mỏng nhẹ cho công việc, di động tốt'
      },
      {
        name: 'Asus Zenbook 14',
        brand_id: brandResults.find(b => b.name === 'Asus').id,
        category_id: categoryResults.find(c => c.name === 'Cao cấp').id,
        cpu: 'Intel Core i7-1360P',
        ram: '16GB LPDDR5',
        storage: '512GB SSD',
        gpu: 'Intel Iris Xe',
        screen_size: '14 inch 2.8K OLED',
        weight: 1.18,
        battery: 70,
        color: 'Vàng',
        price: 31990000,
        cost_price: 24000000,
        stock: 11,
        image_url: '/images/products/AsusZenBook14.jpg',
        description: 'Laptop mỏng nhẹ cao cấp, màn hình OLED xuất sắc'
      },
      {
        name: 'MacBook Pro 14 M2',
        brand_id: brandResults.find(b => b.name === 'Apple').id,
        category_id: categoryResults.find(c => c.name === 'Đồ họa').id,
        cpu: 'Apple M2 Pro',
        ram: '16GB Unified Memory',
        storage: '512GB SSD',
        gpu: 'Apple GPU 19-core',
        screen_size: '14 inch Liquid Retina XDR',
        weight: 1.6,
        battery: 120,
        color: 'Xám',
        price: 47990000,
        cost_price: 38000000,
        stock: 7,
        image_url: '/images/products/MacBookPro14M2Pro.jpg',
        description: 'MacBook Pro M2 chuyên nghiệp cho designer'
      },
      {
        name: 'Gigabyte Aorus 15',
        brand_id: brandResults.find(b => b.name === 'Gigabyte').id,
        category_id: categoryResults.find(c => c.name === 'Gaming').id,
        cpu: 'Intel Core i7-13700K',
        ram: '32GB DDR5',
        storage: '1TB SSD',
        gpu: 'NVIDIA RTX 4070',
        screen_size: '15.6 inch QHD 240Hz',
        weight: 2.3,
        battery: 90,
        color: 'Đen',
        price: 42990000,
        cost_price: 33000000,
        stock: 9,
        image_url: '/images/products/MSIGP66Leopard.jpg',
        description: 'Laptop gaming Gigabyte mạnh mẽ cho esports'
      },
      {
        name: 'HP Pavilion 15',
        brand_id: brandResults.find(b => b.name === 'HP').id,
        category_id: categoryResults.find(c => c.name === 'Sinh viên').id,
        cpu: 'Intel Core i5-1235U',
        ram: '8GB DDR4',
        storage: '512GB SSD',
        gpu: 'Intel UHD Graphics',
        screen_size: '15.6 inch FHD',
        weight: 1.74,
        battery: 48,
        color: 'Bạc',
        price: 12490000,
        cost_price: 8900000,
        stock: 28,
        image_url: '/images/products/HPPavilion15-eg2058TX.jpg',
        description: 'Laptop HP giá rẻ cho học sinh sinh viên'
      },
      {
        name: 'Lenovo Yoga Slim 7',
        brand_id: brandResults.find(b => b.name === 'Lenovo').id,
        category_id: categoryResults.find(c => c.name === 'Cao cấp').id,
        cpu: 'Intel Core i7-1360P',
        ram: '16GB LPDDR5',
        storage: '512GB SSD',
        gpu: 'Intel Iris Xe',
        screen_size: '14 inch FHD',
        weight: 1.19,
        battery: 70,
        color: 'Bạc',
        price: 25990000,
        cost_price: 19000000,
        stock: 13,
        image_url: '/images/products/LenovoYogaSlim7.jpg',
        description: 'Laptop mỏnh nhẹ Lenovo Yoga hiệu năng cao'
      },
      {
        name: 'Acer Predator Helios 300',
        brand_id: brandResults.find(b => b.name === 'Acer').id,
        category_id: categoryResults.find(c => c.name === 'Gaming').id,
        cpu: 'Intel Core i9-12900HK',
        ram: '32GB DDR5',
        storage: '1TB SSD',
        gpu: 'NVIDIA RTX 3080 Ti',
        screen_size: '17.3 inch FHD 144Hz',
        weight: 2.95,
        battery: 85,
        color: 'Đen xanh',
        price: 44990000,
        cost_price: 35000000,
        stock: 6,
        image_url: '/images/products/AcerPredatorHelios300.jpg',
        description: 'Laptop gaming 17 inch Acer Predator mạnh mẽ'
      },
      {
        name: 'MSI Modern 14',
        brand_id: brandResults.find(b => b.name === 'MSI').id,
        category_id: categoryResults.find(c => c.name === 'Văn phòng').id,
        cpu: 'Intel Core i7-1280P',
        ram: '16GB DDR5',
        storage: '512GB SSD',
        gpu: 'Intel Iris Xe',
        screen_size: '14 inch FHD',
        weight: 1.43,
        battery: 75,
        color: 'Xám',
        price: 19990000,
        cost_price: 15000000,
        stock: 19,
        image_url: '/images/products/MSIModern14C12M.jpg',
        description: 'Laptop MSI Modern cho doanh nhân chuyên nghiệp'
      },
      {
        name: 'Asus TUF Gaming F15',
        brand_id: brandResults.find(b => b.name === 'Asus').id,
        category_id: categoryResults.find(c => c.name === 'Gaming').id,
        cpu: 'Intel Core i7-12700H',
        ram: '16GB DDR4',
        storage: '512GB SSD',
        gpu: 'NVIDIA RTX 3050',
        screen_size: '15.6 inch FHD 144Hz',
        weight: 2.25,
        battery: 90,
        color: 'Xám',
        price: 16990000,
        cost_price: 12500000,
        stock: 21,
        image_url: '/images/products/AsusTUFGamingF15.jpg',
        description: 'Laptop gaming Asus TUF bền bỉ, giá tốt'
      },
    ];

    for (const product of products) {
      await client.query(
        `INSERT INTO products (name, brand_id, category_id, cpu, ram, storage, gpu, screen_size, weight, battery, color, price, cost_price, stock, image_url, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [product.name, product.brand_id, product.category_id, product.cpu, product.ram, product.storage,
         product.gpu, product.screen_size, product.weight, product.battery, product.color, product.price,
         product.cost_price, product.stock, product.image_url, product.description]
      );
    }
    console.log('✅ 20 sản phẩm đã tạo');

    // Create Coupons (5 coupons)
    const coupons = [
      {
        code: 'WELCOME10',
        discount_percent: 10,
        max_discount: 2000000,
        max_uses: 100,
        valid_from: new Date(),
        valid_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        description: 'Mã giảm giá chào mừng 10% cho đơn đầu tiên'
      },
      {
        code: 'SUMMER20',
        discount_percent: 20,
        max_discount: 5000000,
        max_uses: 50,
        valid_from: new Date(),
        valid_to: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        description: 'Mã giảm giá mùa hè 20% giới hạn'
      },
      {
        code: 'GAMING15',
        discount_percent: 15,
        max_discount: 3000000,
        max_uses: 200,
        valid_from: new Date(),
        valid_to: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        description: 'Mã giảm giá cho laptop gaming 15%'
      },
      {
        code: 'STUDENT5',
        discount_percent: 5,
        max_discount: 1000000,
        max_uses: 1000,
        valid_from: new Date(),
        valid_to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        description: 'Mã giảm giá sinh viên 5% hàng năm'
      },
      {
        code: 'LOYALTY25',
        discount_percent: 25,
        max_discount: 7000000,
        max_uses: 20,
        valid_from: new Date(),
        valid_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        description: 'Mã giảm giá khách hàng thân thiết 25%'
      },
    ];

    for (const coupon of coupons) {
      await client.query(
        `INSERT INTO coupons (code, discount_percent, max_discount, max_uses, valid_from, valid_to, description, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [coupon.code, coupon.discount_percent, coupon.max_discount, coupon.max_uses, coupon.valid_from, coupon.valid_to, coupon.description]
      );
    }
    console.log('✅ 5 mã giảm giá đã tạo');

    console.log('🎉 Dữ liệu tiếng Việt đã tạo thành công!');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi tạo dữ liệu:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
};

seedVietnameseData();
