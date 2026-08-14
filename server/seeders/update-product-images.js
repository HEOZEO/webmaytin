const { pool } = require('../config/database');

const UPDATE_PRODUCT_IMAGES = {
  'Dell Inspiron 3520': 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&fit=crop&w=800&q=80',
  'Dell Vostro 3520': 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
  'Dell XPS 13 9320': 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80',
  'Dell Gaming G15 5520': 'https://images.unsplash.com/photo-1611186711899-3b4656c40e57?auto=format&fit=crop&w=800&q=80',
  'HP Pavilion 15-eg2058TX': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
  'HP Envy 13-ba1030TU': 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80',
  'HP Omen 16-c0142AX': 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80',
  'HP EliteBook 840 G9': 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
  'Lenovo ThinkPad E14 Gen 4': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
  'Lenovo IdeaPad Gaming 3': 'https://images.unsplash.com/photo-1593642634524-b40b5baae6bb?auto=format&fit=crop&w=800&q=80',
  'Lenovo Yoga Slim 7': 'https://images.unsplash.com/photo-1484788984921-03950022c9ef?auto=format&fit=crop&w=800&q=80',
  'Lenovo Legion 5': 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=800&q=80',
  'MacBook Air M1 2020': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
  'MacBook Air M2 2022': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
  'MacBook Pro 13" M2': 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80',
  'MacBook Pro 14" M2 Pro': 'https://images.unsplash.com/photo-1593642634524-b40b5baae6bb?auto=format&fit=crop&w=800&q=80',
  'Asus VivoBook 15 X515': 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80',
  'Asus ZenBook 14': 'https://images.unsplash.com/photo-1593642634524-b40b5baae6bb?auto=format&fit=crop&w=800&q=80',
  'Asus ROG Strix G15': 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=800&q=80',
  'Asus TUF Gaming F15': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
  'Acer Aspire 3 A315-58': 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80',
  'Acer Swift 3 SF314-512': 'https://images.unsplash.com/photo-1593642634524-b40b5baae6bb?auto=format&fit=crop&w=800&q=80',
  'Acer Nitro 5 AN515-58': 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=800&q=80',
  'Acer Predator Helios 300': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
  'MSI Modern 14 C12M': 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=800&q=80',
  'MSI GF63 Thin 11SC': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
  'MSI Gaming Katana GF66': 'https://images.unsplash.com/photo-1611186711899-3b4656c40e57?auto=format&fit=crop&w=800&q=80',
  'MSI GP66 Leopard': 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=800&q=80'
};

async function updateImages() {
  const client = await pool.connect();
  try {
    let updated = 0;
    for (const [name, imageUrl] of Object.entries(UPDATE_PRODUCT_IMAGES)) {
      const result = await client.query(
        'UPDATE products SET image_url = $1 WHERE name = $2 RETURNING id',
        [imageUrl, name]
      );
      if (result.rows.length > 0) {
        updated++;
        console.log(`✓ Updated: ${name}`);
      }
    }
    console.log(`\n✅ Đã cập nhật ${updated} sản phẩm`);
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateImages();
