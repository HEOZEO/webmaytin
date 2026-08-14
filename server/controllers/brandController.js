const { pool } = require('../config/database');

exports.getBrands = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, COUNT(p.id) as product_count
       FROM brands b
       LEFT JOIN products p ON b.id = p.brand_id
       GROUP BY b.id
       ORDER BY b.name`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy thương hiệu' });
  }
};

exports.createBrand = async (req, res) => {
  try {
    const { name, description } = req.body;

    const result = await pool.query(
      'INSERT INTO brands (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [req.user.id, 'BRAND_CREATE', `Tạo thương hiệu: ${name}`]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo thương hiệu' });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const result = await pool.query(
      'UPDATE brands SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thương hiệu' });
    }

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [req.user.id, 'BRAND_UPDATE', `Cập nhật thương hiệu: ${name}`]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update brand error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật thương hiệu' });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if brand has products
    const productCheck = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE brand_id = $1',
      [id]
    );

    if (parseInt(productCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể xóa thương hiệu đang có sản phẩm' 
      });
    }

    const result = await pool.query('DELETE FROM brands WHERE id = $1 RETURNING name', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thương hiệu' });
    }

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [req.user.id, 'BRAND_DELETE', `Xóa thương hiệu: ${result.rows[0].name}`]
    );

    res.json({
      success: true,
      message: 'Xóa thương hiệu thành công'
    });
  } catch (error) {
    console.error('Delete brand error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa thương hiệu' });
  }
};
