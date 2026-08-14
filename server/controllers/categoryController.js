const { pool } = require('../config/database');

exports.getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id
       GROUP BY c.id
       ORDER BY c.name`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh mục' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const result = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [req.user.id, 'CATEGORY_CREATE', `Tạo danh mục: ${name}`]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo danh mục' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const result = await pool.query(
      'UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    }

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [req.user.id, 'CATEGORY_UPDATE', `Cập nhật danh mục: ${name}`]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật danh mục' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has products
    const productCheck = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = $1',
      [id]
    );

    if (parseInt(productCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể xóa danh mục đang có sản phẩm' 
      });
    }

    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING name', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    }

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [req.user.id, 'CATEGORY_DELETE', `Xóa danh mục: ${result.rows[0].name}`]
    );

    res.json({
      success: true,
      message: 'Xóa danh mục thành công'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa danh mục' });
  }
};
