const { Client } = require('pg');

const imageUrls = [
  'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=400&h=300&fit=crop',  // Dell Inspiron 3520
  'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop',  // Dell Vostro 3520
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop',  // Dell XPS 13 9320
  'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=300&fit=crop',  // Dell Gaming G15 5520
  'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&h=300&fit=crop',  // HP Pavilion 15
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',  // HP Envy 13
  'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=400&h=300&fit=crop',  // HP Omen 16
  'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&h=300&fit=crop',  // HP EliteBook 840
  'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop',  // Lenovo ThinkPad E14
  'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=300&fit=crop',  // Lenovo IdeaPad Gaming 3
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop',  // Lenovo Yoga Slim 7
  'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&h=300&fit=crop',  // Lenovo Legion 5
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',  // MacBook Air M1
  'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&h=300&fit=crop',  // MacBook Air M2
  'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop',  // MacBook Pro 13 M2
  'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=400&h=300&fit=crop',  // MacBook Pro 14 M2 Pro
  'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=300&fit=crop',  // Asus VivoBook 15
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop',  // Asus ZenBook 14
  'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&h=300&fit=crop',  // Asus ROG Strix G15
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',  // Asus TUF Gaming F15
  'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&h=300&fit=crop',  // Acer Aspire 3
  'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop',  // Acer Swift 3
  'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=300&fit=crop',  // Acer Nitro 5
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop',  // Acer Predator Helios 300
  'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&h=300&fit=crop',  // MSI Modern 14
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',  // MSI GF63 Thin
  'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&h=300&fit=crop',  // MSI Gaming Katana GF66
  'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=300&fit=crop',  // MSI GP66 Leopard
];

async function updateImages() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'shopmaytinh',
    user: 'postgres',
    password: '123'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    for (let i = 0; i < imageUrls.length; i++) {
      const productId = i + 1;
      const imageUrl = imageUrls[i];
      
      const result = await client.query(
        'UPDATE products SET image_url = $1 WHERE id = $2 RETURNING id, name, image_url',
        [imageUrl, productId]
      );
      
      if (result.rows.length > 0) {
        console.log(`Updated product ${productId}: ${result.rows[0].name}`);
      }
    }

    console.log('\nAll product images updated successfully!');
  } catch (error) {
    console.error('Error updating images:', error);
  } finally {
    await client.end();
  }
}

updateImages();
