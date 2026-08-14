const express = require('express');
const router = express.Router();
const { findImageForProduct } = require('../../scripts/updateProductImages');
const { pool } = require('../../config/database');
const { protect, authorize } = require('../../middleware/auth');

// Staff + Admin đều truy cập được image sync
router.use(protect, authorize('admin', 'staff'));

/**
 * Update product images endpoint
 * POST /api/admin/sync-images
 */
router.post('/sync-images', async (req, res) => {
  try {
    console.log(`🖼️  [${req.user.role}] Starting image sync process...`);

    const productsResult = await pool.query(
      `SELECT id, name, image_url FROM products
       WHERE image_url IS NULL OR image_url = '' OR image_url LIKE '%placeholder%'`
    );
    const products = productsResult.rows;

    console.log(`Found ${products.length} products to update`);

    const results = {
      updated: [],
      failed: [],
      total: products.length
    };

    for (const product of products) {
      try {
        const matchingImage = findImageForProduct(product.name);

        if (matchingImage) {
          await pool.query(
            `UPDATE products SET image_url = $1, updated_at = NOW() WHERE id = $2`,
            [matchingImage, product.id]
          );

          results.updated.push({
            id: product.id,
            name: product.name,
            image_url: matchingImage
          });

          console.log(`✅ Updated: ${product.name} → ${matchingImage}`);
        } else {
          results.failed.push({
            id: product.id,
            name: product.name,
            reason: 'No matching image found'
          });

          console.log(`❌ No image found for: ${product.name}`);
        }
      } catch (error) {
        results.failed.push({
          id: product.id,
          name: product.name,
          reason: error.message
        });

        console.error(`❌ Error updating ${product.name}:`, error.message);
      }
    }

    console.log(`\n📊 Sync completed: ${results.updated.length} updated, ${results.failed.length} failed`);

    res.json({
      success: true,
      message: 'Image sync completed',
      results
    });

  } catch (error) {
    console.error('❌ Image sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync images',
      error: error.message
    });
  }
});

/**
 * Test image mapping endpoint
 * POST /api/admin/test-image-mapping
 */
router.post('/test-image-mapping', async (req, res) => {
  try {
    const { productName } = req.body;

    if (!productName) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }

    const matchingImage = findImageForProduct(productName);

    res.json({
      success: true,
      productName,
      matchingImage: matchingImage || null,
      hasMatch: !!matchingImage
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to test image mapping',
      error: error.message
    });
  }
});

/**
 * Get image sync status
 * GET /api/admin/image-sync-status
 */
router.get('/image-sync-status', async (req, res) => {
  try {
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM products');
    const totalProducts = parseInt(totalResult.rows[0].total);

    const withImagesResult = await pool.query(
      `SELECT COUNT(*) as count FROM products
       WHERE image_url IS NOT NULL AND image_url != '' AND image_url NOT LIKE '%placeholder%'`
    );
    const productsWithImages = parseInt(withImagesResult.rows[0].count);

    const productsWithoutImages = totalProducts - productsWithImages;

    res.json({
      success: true,
      status: {
        total: totalProducts,
        withImages: productsWithImages,
        withoutImages: productsWithoutImages,
        syncedPercentage: totalProducts > 0 ? ((productsWithImages / totalProducts) * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      error: error.message
    });
  }
});

/**
 * Manual image update for specific product
 * PATCH /api/admin/products/:id/image
 */
router.patch('/products/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const { image_url } = req.body;

    const result = await pool.query(
      `UPDATE products SET image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, image_url`,
      [image_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product image updated successfully',
      product: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update product image',
      error: error.message
    });
  }
});

module.exports = router;