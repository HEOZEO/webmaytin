const { pool } = require('../config/database');

exports.getLogs = async (req, res) => {
  try {
    const { action, user_id, page = 1, limit = 50 } = req.query;

    let query = `
      SELECT l.*, u.email, u.full_name
      FROM activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (action) {
      query += ` AND l.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (user_id) {
      query += ` AND l.user_id = $${paramIndex}`;
      params.push(parseInt(user_id));
      paramIndex++;
    }

    query += ' ORDER BY l.created_at DESC';

    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM activity_logs WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (action) {
      countQuery += ` AND action = $${countParamIndex}`;
      countParams.push(action);
      countParamIndex++;
    }

    if (user_id) {
      countQuery += ` AND user_id = $${countParamIndex}`;
      countParams.push(parseInt(user_id));
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy nhật ký hoạt động' });
  }
};
