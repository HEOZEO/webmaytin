const { pool } = require('../config/database');

// GET /api/locations/districts - Get all districts with zone info
exports.getDistricts = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, code, name, zone, shipping_fee FROM districts ORDER BY zone ASC, name ASC'
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get districts error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách quận/huyện' });
  }
};

// GET /api/locations/wards/:districtId - Get wards by district
exports.getWards = async (req, res) => {
  try {
    const { districtId } = req.params;
    const result = await pool.query(
      'SELECT id, district_id, code, name FROM wards WHERE district_id = $1 ORDER BY name ASC',
      [districtId]
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get wards error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách phường/xã' });
  }
};

// GET /api/locations/wards - Get all wards
exports.getAllWards = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.id, w.district_id, w.code, w.name, d.name as district_name, d.zone, d.shipping_fee
       FROM wards w
       JOIN districts d ON w.district_id = d.id
       ORDER BY d.zone ASC, d.name ASC, w.name ASC`
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get all wards error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách phường/xã' });
  }
};

// GET /api/locations/shipping-fee - Calculate shipping fee for a district
exports.getShippingFee = async (req, res) => {
  try {
    const { district_id } = req.query;
    if (!district_id) {
      return res.status(400).json({ success: false, message: 'Thiếu district_id' });
    }
    const result = await pool.query(
      'SELECT id, name, zone, shipping_fee FROM districts WHERE id = $1',
      [district_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quận/huyện không tồn tại' });
    }
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get shipping fee error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tính phí ship' });
  }
};
