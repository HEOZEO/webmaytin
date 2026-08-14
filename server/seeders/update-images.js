const { pool } = require('../config/database');

// Mapping tên sản phẩm với tên file ảnh thực tế
const imageMapping = {
  'Dell Inspiron 3520': 'DellInspiron3520.jpg',
  'Dell Vostro 3520': 'DellVostro3520.jpg',
  'Dell XPS 13 9320': 'DellXPS139320.jpg',
  'Dell Gaming G15 5520': 'DellGamingG155520.jpg',
  
  'HP Pavilion 15-eg2058TX': 'HPPavilion15-eg2058TX.jpg',
  'HP Envy 13-ba1030TU': 'HPEnvy13-ba1030TU.jpg',
  'HP Omen 16-c0142AX': 'HPOmen16-c0142AX.jpg',
  'HP EliteBook 840 G9': 'HPEliteBook840G9.jpg',
  
  'Lenovo ThinkPad E14 Gen 4': 'LenovoThinkPadE14Gen4.jpg',
  'Lenovo IdeaPad Gaming 3': 'LenovoIdeaPadGaming3.jpg',
  'Lenovo Yoga Slim 7': 'LenovoYogaSlim7.jpg',
  'Lenovo Legion 5': 'LenovoLegion5.jpg',
  
  'MacBook Air M1 2020': 'MacBookAirM12020.jpg',
  'MacBook Air M2 2022': 'MacBookAirM22022.jpg',
  'MacBook Pro 13" M2': 'MacBookPro13M2.jpg',
  'MacBook Pro 14" M2 Pro': 'MacBookPro14M2Pro.jpg',
  
  'Asus VivoBook 15 X515': 'AsusVivoBook15X515.jpg',
  'Asus ZenBook 14': 'AsusZenBook14.jpg',
  'Asus ROG Strix G15': 'AsusROGStrixG15.jpg',
  'Asus TUF Gaming F15': 'AsusTUFGamingF15.jpg',
  
  'Acer Aspire 3 A315-58': 'AcerAspire3A315-58.jpg',
  'Acer Swift 3 SF314-512': 'AcerSwift 3SF314-512.jpg',
  'Acer Nitro 5 AN515-58': 'AcerNitro5AN515-58.jpg',
  'Acer Predator Helios 300': 'AcerPredatorHelios300.jpg',
  
  'MSI Modern 14 C12M': 'MSIModern14C12M.jpg',
  'MSI GF63 Thin 11SC': 'MSIGF63Thin11SC.jpg',
  'MSI Gaming Katana GF66': 'MSIGamingKatanaGF66.jpg',
  'MSI GP66 Leopard': 'MSIGP66Leopard.jpg'
};

const updateProductImages = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Cập nhật ảnh sản phẩm...');
    
    let updated = 0;
    let notFound = 0;
    
    for (const [productName, imageFile] of Object.entries(imageMapping)) {
      const imageUrl = `/images/products/${imageFile}`;
      
      const result = await client.query(
        'UPDATE products SET image_url = $1 WHERE name = $2 RETURNING id, name',
        [imageUrl, productName]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ Updated: ${productName} -> ${imageFile}`);
        updated++;
      } else {
        console.log(`⚠️  Not found: ${productName}`);
        notFound++;
      }
    }
    
    console.log('\n📊 Kết quả:');
    console.log(`✅ Đã cập nhật: ${updated} sản phẩm`);
    console.log(`⚠️  Không tìm thấy: ${notFound} sản phẩm`);
    console.log('\n✨ Hoàn thành!');
    
  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    client.release();
    await pool.end();
  }
};

updateProductImages();
