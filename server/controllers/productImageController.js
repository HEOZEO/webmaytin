const { pool } = require('../config/database');

exports.getProductImages = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM product_images WHERE product_id = $1 ORDER BY position ASC, id ASC',
      [productId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting product images:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.createProductImage = async (req, res) => {
  try {
    const { productId } = req.params;
    const { image_url, is_primary = false, position = 0 } = req.body;

    // If setting as primary, unset other primary images
    if (is_primary) {
      await pool.query(
        'UPDATE product_images SET is_primary = false WHERE product_id = $1',
        [productId]
      );
    }

    const result = await pool.query(
      'INSERT INTO product_images (product_id, image_url, is_primary, position) VALUES ($1, $2, $3, $4) RETURNING *',
      [productId, image_url, is_primary, position]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating product image:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.updateProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { image_url, is_primary, position } = req.body;

    const checkResult = await pool.query('SELECT product_id FROM product_images WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Hình ảnh không tồn tại' });
    }

    // If setting as primary, unset other primary images for this product
    if (is_primary) {
      await pool.query(
        'UPDATE product_images SET is_primary = false WHERE product_id = $1',
        [checkResult.rows[0].product_id]
      );
    }

    const result = await pool.query(
      'UPDATE product_images SET image_url = $1, is_primary = $2, position = $3 WHERE id = $4 RETURNING *',
      [image_url, is_primary, position, id]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating product image:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.deleteProductImage = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM product_images WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Hình ảnh không tồn tại' });
    }

    res.json({
      success: true,
      message: 'Xóa hình ảnh thành công'
    });
  } catch (error) {
    console.error('Error deleting product image:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};