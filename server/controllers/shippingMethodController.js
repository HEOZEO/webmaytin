const { pool } = require('../config/database');

exports.getShippingMethods = async (req, res) => {
  try {
    const { active } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    
    if (active !== undefined) {
      whereClause = 'WHERE is_active = $1';
      queryParams = [active === 'true'];
    }

    const result = await pool.query(`
      SELECT * FROM shipping_methods 
      ${whereClause}
      ORDER BY cost ASC
    `, queryParams);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting shipping methods:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.getShippingMethod = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM shipping_methods WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Phương thức vận chuyển không tồn tại' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting shipping method:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.createShippingMethod = async (req, res) => {
  try {
    const { name, description, cost, estimated_days, is_active = true } = req.body;

    const result = await pool.query(
      'INSERT INTO shipping_methods (name, description, cost, estimated_days, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, cost, estimated_days, is_active]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating shipping method:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.updateShippingMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, cost, estimated_days, is_active } = req.body;

    const result = await pool.query(
      'UPDATE shipping_methods SET name = $1, description = $2, cost = $3, estimated_days = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [name, description, cost, estimated_days, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Phương thức vận chuyển không tồn tại' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating shipping method:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.deleteShippingMethod = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM shipping_methods WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Phương thức vận chuyển không tồn tại' });
    }

    res.json({
      success: true,
      message: 'Xóa phương thức vận chuyển thành công'
    });
  } catch (error) {
    console.error('Error deleting shipping method:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};