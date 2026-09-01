const { pool } = require('../config/database');

exports.getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id
       WHERE c.is_hidden = false OR c.is_hidden IS NULL
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

exports.getAdminCategories = async (req, res) => {
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
    console.error('Get admin categories error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh mục admin' });
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

exports.toggleCategoryVisibility = async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy trạng thái hiện tại
    const current = await pool.query('SELECT name, is_hidden FROM categories WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    }

    const newHiddenStatus = !current.rows[0].is_hidden;

    const result = await pool.query(
      'UPDATE categories SET is_hidden = $1 WHERE id = $2 RETURNING *',
      [newHiddenStatus, id]
    );

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [req.user.id, 'CATEGORY_TOGGLE_VISIBILITY', `${newHiddenStatus ? 'Ẩn' : 'Hiện'} danh mục: ${result.rows[0].name}`]
    );

    res.json({
      success: true,
      message: newHiddenStatus ? 'Đã ẩn danh mục' : 'Đã hiện danh mục',
      is_hidden: newHiddenStatus
    });
  } catch (error) {
    console.error('Toggle category visibility error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái danh mục' });
  }
};
