const { pool } = require('../config/database');

exports.getProductSpecs = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM product_specs WHERE product_id = $1 ORDER BY id ASC',
      [productId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting product specs:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.createProductSpec = async (req, res) => {
  try {
    const { productId } = req.params;
    const { spec_name, spec_value } = req.body;

    const result = await pool.query(
      'INSERT INTO product_specs (product_id, spec_name, spec_value) VALUES ($1, $2, $3) RETURNING *',
      [productId, spec_name, spec_value]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating product spec:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.updateProductSpec = async (req, res) => {
  try {
    const { id } = req.params;
    const { spec_name, spec_value } = req.body;

    const result = await pool.query(
      'UPDATE product_specs SET spec_name = $1, spec_value = $2 WHERE id = $3 RETURNING *',
      [spec_name, spec_value, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Thông số không tồn tại' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating product spec:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.deleteProductSpec = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM product_specs WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Thông số không tồn tại' });
    }

    res.json({
      success: true,
      message: 'Xóa thông số thành công'
    });
  } catch (error) {
    console.error('Error deleting product spec:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.bulkCreateProductSpecs = async (req, res) => {
  try {
    const { productId } = req.params;
    const { specs } = req.body; // Array of {spec_name, spec_value}

    if (!Array.isArray(specs) || specs.length === 0) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }

    // Delete existing specs
    await pool.query('DELETE FROM product_specs WHERE product_id = $1', [productId]);

    // Insert new specs
    const values = specs.map((_, index) => `($1, $${index * 2 + 2}, $${index * 2 + 3})`).join(', ');
    const params = [productId];
    specs.forEach(spec => {
      params.push(spec.spec_name, spec.spec_value);
    });

    const result = await pool.query(
      `INSERT INTO product_specs (product_id, spec_name, spec_value) VALUES ${values} RETURNING *`,
      params
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error bulk creating product specs:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};