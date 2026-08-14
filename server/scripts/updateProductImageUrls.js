const { pool } = require('../config/database');

// Update product image URLs to match filename format
async function updateProductImageUrls() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Updating product image URLs...');
    
    // Get all products
    const result = await client.query('SELECT id, name FROM products');
    const products = result.rows;
    
    console.log(`📦 Found ${products.length} products`);
    
    for (const product of products) {
      // Remove spaces and special characters from product name
      const cleanName = product.name
        .trim()
        .replace(/\s+/g, '') // Remove all spaces
        .replace(/[^\w\-]/g, ''); // Keep only alphanumeric and hyphens
      
      const imageUrl = `/images/products/${cleanName}.jpg`;
      
      // Update image_url
      await client.query(
        'UPDATE products SET image_url = $1 WHERE id = $2',
        [imageUrl, product.id]
      );
      
      console.log(`✅ Updated: ${product.name} -> ${imageUrl}`);
    }
    
    console.log('✨ All product image URLs updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating image URLs:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateProductImageUrls();
