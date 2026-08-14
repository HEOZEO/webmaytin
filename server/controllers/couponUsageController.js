const { pool } = require('../config/database');

exports.getCouponUsages = async (req, res) => {
  try {
    const { page = 1, limit = 10, couponId, userId } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (couponId) {
      whereConditions.push(`cu.coupon_id = $${paramIndex++}`);
      queryParams.push(couponId);
    }

    if (userId) {
      whereConditions.push(`cu.user_id = $${paramIndex++}`);
      queryParams.push(userId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT 
        cu.*, 
        c.code as coupon_code,
        c.discount_percent,
        u.full_name as user_name,
        u.email as user_email,
        o.final_amount as order_amount
      FROM coupon_usage cu
      JOIN coupons c ON cu.coupon_id = c.id
      JOIN users u ON cu.user_id = u.id
      JOIN orders o ON cu.order_id = o.id
      ${whereClause}
      ORDER BY cu.used_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...queryParams, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) FROM coupon_usage cu
      JOIN coupons c ON cu.coupon_id = c.id
      JOIN users u ON cu.user_id = u.id
      ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
        totalItems: parseInt(countResult.rows[0].count),
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting coupon usages:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.getCouponUsage = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        cu.*, 
        c.code as coupon_code,
        c.discount_percent,
        u.full_name as user_name,
        u.email as user_email,
        o.final_amount as order_amount
      FROM coupon_usage cu
      JOIN coupons c ON cu.coupon_id = c.id
      JOIN users u ON cu.user_id = u.id
      JOIN orders o ON cu.order_id = o.id
      WHERE cu.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Lịch sử sử dụng coupon không tồn tại' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting coupon usage:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.getUserCouponUsages = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        cu.*, 
        c.code as coupon_code,
        c.discount_percent,
        o.final_amount as order_amount
      FROM coupon_usage cu
      JOIN coupons c ON cu.coupon_id = c.id
      JOIN orders o ON cu.order_id = o.id
      WHERE cu.user_id = $1
      ORDER BY cu.used_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM coupon_usage WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
        totalItems: parseInt(countResult.rows[0].count),
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting user coupon usages:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.getCouponUsageStats = async (req, res) => {
  try {
    const { couponId } = req.params;

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_uses,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(o.discount_amount) as total_discount_given
      FROM coupon_usage cu
      JOIN orders o ON cu.order_id = o.id
      WHERE cu.coupon_id = $1
    `, [couponId]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting coupon usage stats:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};