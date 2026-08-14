/**
 * Script to update product images in database
 * Run with: node scripts/updateProductImages.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'laptop_store'
};

// Product name to image mapping
const productImageMap = {
  // Acer products
  'acer aspire 3 a315-58': 'products/AcerAspire3A315-58.jpg',
  'acer nitro 5 an515-58': 'products/AcerNitro5AN515-58.jpg',
  'acer predator helios 300': 'products/AcerPredatorHelios300.jpg',
  'acer swift 3 sf314-512': 'products/AcerSwift 3SF314-512.jpg',
  
  // ASUS products  
  'asus rog strix g15': 'products/AsusROGStrixG15.jpg',
  'asus tuf gaming f15': 'products/AsusTUFGamingF15.jpg',
  'asus vivobook 15 x515': 'products/AsusVivoBook15X515.jpg',
  'asus zenbook 14': 'products/AsusZenBook14.jpg',
  
  // Dell products
  'dell gaming g15 5520': 'products/DellGamingG155520.jpg',
  'dell inspiron 3520': 'products/DellInspiron3520.jpg',
  'dell vostro 3520': 'products/DellVostro3520.jpg',
  'dell xps 13 9320': 'products/DellXPS139320.jpg',
  
  // HP products
  'hp elitebook 840 g9': 'products/HPEliteBook840G9.jpg',
  'hp envy 13-ba1030tu': 'products/HPEnvy13-ba1030TU.jpg',
  'hp omen 16-c0142ax': 'products/HPOmen16-c0142AX.jpg',
  'hp pavilion 15-eg2058tx': 'products/HPPavilion15-eg2058TX.jpg',
  
  // Lenovo products
  'lenovo ideapad gaming 3': 'products/LenovoIdeaPadGaming3.jpg',
  'lenovo legion 5': 'products/LenovoLegion5.jpg',
  'lenovo thinkpad e14 gen 4': 'products/LenovoThinkPadE14Gen4.jpg',
  'lenovo yoga slim 7': 'products/LenovoYogaSlim7.jpg',
  
  // MacBook products
  'macbook air m1 2020': 'products/MacBookAirM12020.jpg',
  'macbook air m2 2022': 'products/MacBookAirM22022.jpg',
  'macbook pro 13 m2': 'products/MacBookPro13M2.jpg',
  'macbook pro 14 m2 pro': 'products/MacBookPro14M2Pro.jpg',
  
  // MSI products
  'msi gaming katana gf66': 'products/MSIGamingKatanaGF66.jpg',
  'msi gf63 thin 11sc': 'products/MSIGF63Thin11SC.jpg',
  'msi gp66 leopard': 'products/MSIGP66Leopard.jpg',
  'msi modern 14 c12m': 'products/MSIModern14C12M.jpg'
};

/**
 * Find best matching image for a product name
 */
function findImageForProduct(productName) {
  const normalizedName = productName.toLowerCase().trim();
  
  // Direct match
  if (productImageMap[normalizedName]) {
    return productImageMap[normalizedName];
  }
  
  // Partial matching
  for (const [key, imagePath] of Object.entries(productImageMap)) {
    const keyWords = key.split(' ');
    const nameWords = normalizedName.split(' ');
    
    // Check if most words match
    const matchingWords = keyWords.filter(word => 
      nameWords.some(nameWord => 
        nameWord.includes(word) || word.includes(nameWord)
      )
    );
    
    if (matchingWords.length >= Math.min(3, keyWords.length)) {
      return imagePath;
    }
  }
  
  // Brand-based fallback
  const brands = ['acer', 'asus', 'dell', 'hp', 'lenovo', 'macbook', 'msi'];
  for (const brand of brands) {
    if (normalizedName.includes(brand)) {
      // Find first image of this brand
      for (const [key, imagePath] of Object.entries(productImageMap)) {
        if (key.includes(brand)) {
          return imagePath;
        }
      }
    }
  }
  
  return null;
}

/**
 * Update product images in database
 */
async function updateProductImages() {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Get all products
    const [products] = await connection.execute('SELECT id, name, image_url FROM products');
    console.log(`📦 Found ${products.length} products`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const product of products) {
      // Skip if already has image
      if (product.image_url && product.image_url.trim()) {
        console.log(`⏭️  Skipping "${product.name}" - already has image: ${product.image_url}`);
        skippedCount++;
        continue;
      }
      
      // Find matching image
      const matchingImage = findImageForProduct(product.name);
      
      if (matchingImage) {
        // Update product with image
        await connection.execute(
          'UPDATE products SET image_url = ? WHERE id = ?',
          [matchingImage, product.id]
        );
        
        console.log(`✅ Updated "${product.name}" → ${matchingImage}`);
        updatedCount++;
      } else {
        console.log(`❌ No image found for "${product.name}"`);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Updated: ${updatedCount} products`);
    console.log(`   Skipped: ${skippedCount} products (already have images)`);
    console.log(`   No match: ${products.length - updatedCount - skippedCount} products`);
    
  } catch (error) {
    console.error('❌ Error updating product images:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

/**
 * Create sample products if database is empty
 */
async function createSampleProducts() {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Check if products exist
    const [existing] = await connection.execute('SELECT COUNT(*) as count FROM products');
    
    if (existing[0].count > 0) {
      console.log('📦 Products already exist, skipping sample creation');
      return;
    }
    
    console.log('🏗️  Creating sample products...');
    
    const sampleProducts = [
      { name: 'Acer Aspire 3 A315-58', price: 12990000, category_id: 1 },
      { name: 'Acer Nitro 5 AN515-58', price: 18990000, category_id: 2 },
      { name: 'Acer Predator Helios 300', price: 35990000, category_id: 2 },
      { name: 'Acer Swift 3 SF314-512', price: 16990000, category_id: 3 },
      { name: 'ASUS ROG Strix G15', price: 28990000, category_id: 2 },
      { name: 'ASUS TUF Gaming F15', price: 22990000, category_id: 2 },
      { name: 'ASUS VivoBook 15 X515', price: 14990000, category_id: 1 },
      { name: 'ASUS ZenBook 14', price: 24990000, category_id: 3 },
      { name: 'Dell Gaming G15 5520', price: 26990000, category_id: 2 },
      { name: 'Dell Inspiron 3520', price: 15990000, category_id: 1 },
      { name: 'Dell Vostro 3520', price: 17990000, category_id: 3 },
      { name: 'Dell XPS 13 9320', price: 32990000, category_id: 3 },
      { name: 'HP EliteBook 840 G9', price: 29990000, category_id: 3 },
      { name: 'HP Envy 13-ba1030TU', price: 19990000, category_id: 3 },
      { name: 'HP Omen 16-c0142AX', price: 31990000, category_id: 2 },
      { name: 'HP Pavilion 15-eg2058TX', price: 18990000, category_id: 1 },
      { name: 'Lenovo IdeaPad Gaming 3', price: 20990000, category_id: 2 },
      { name: 'Lenovo Legion 5', price: 27990000, category_id: 2 },
      { name: 'Lenovo ThinkPad E14 Gen 4', price: 21990000, category_id: 3 },
      { name: 'Lenovo Yoga Slim 7', price: 23990000, category_id: 3 },
      { name: 'MacBook Air M1 2020', price: 27990000, category_id: 3 },
      { name: 'MacBook Air M2 2022', price: 32990000, category_id: 3 },
      { name: 'MacBook Pro 13 M2', price: 36990000, category_id: 3 },
      { name: 'MacBook Pro 14 M2 Pro', price: 55990000, category_id: 3 },
      { name: 'MSI Gaming Katana GF66', price: 24990000, category_id: 2 },
      { name: 'MSI GF63 Thin 11SC', price: 19990000, category_id: 2 },
      { name: 'MSI GP66 Leopard', price: 32990000, category_id: 2 },
      { name: 'MSI Modern 14 C12M', price: 16990000, category_id: 1 }
    ];
    
    for (const product of sampleProducts) {
      await connection.execute(
        'INSERT INTO products (name, price, category_id, stock, created_at) VALUES (?, ?, ?, ?, NOW())',
        [product.name, product.price, product.category_id, Math.floor(Math.random() * 50) + 10]
      );
    }
    
    console.log(`✅ Created ${sampleProducts.length} sample products`);
    
  } catch (error) {
    console.error('❌ Error creating sample products:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting product image update script...\n');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--create-samples')) {
    await createSampleProducts();
  }
  
  await updateProductImages();
  
  console.log('\n🎉 Script completed!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  updateProductImages,
  createSampleProducts,
  findImageForProduct
};