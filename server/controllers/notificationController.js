const { pool } = require('../config/database');

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, is_read } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (is_read !== undefined) {
      whereConditions.push(`is_read = $${paramIndex++}`);
      queryParams.push(is_read === 'true');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT 
        n.*, 
        u.full_name as user_name,
        u.email as user_email
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...queryParams, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) FROM notifications n
      JOIN users u ON n.user_id = u.id
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
    console.error('Error getting notifications:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, is_read } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [`user_id = $1`];
    let queryParams = [userId];
    let paramIndex = 2;

    if (is_read !== undefined) {
      whereConditions.push(`is_read = $${paramIndex++}`);
      queryParams.push(is_read === 'true');
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const result = await pool.query(`
      SELECT * FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...queryParams, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) FROM notifications
      ${whereClause}
    `, queryParams);

    const unreadCount = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
      unreadCount: parseInt(unreadCount.rows[0].count),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
        totalItems: parseInt(countResult.rows[0].count),
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.createNotification = async (req, res) => {
  try {
    const { user_id, title, message, link } = req.body;

    const result = await pool.query(
      'INSERT INTO notifications (user_id, title, message, link) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, title, message, link]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({
      success: true,
      message: 'Đã đánh dấu tất cả thông báo là đã đọc'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
    }

    res.json({
      success: true,
      message: 'Xóa thông báo thành công'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.broadcastNotification = async (req, res) => {
  try {
    const { title, message, link, role } = req.body;

    let userQuery = 'SELECT id FROM users';
    let queryParams = [];

    if (role && role !== 'all') {
      userQuery += ' WHERE role = $1';
      queryParams = [role];
    }

    const users = await pool.query(userQuery, queryParams);

    if (users.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Create notifications for all users
    const values = users.rows.map((_, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3}, $${index * 3 + 4})`).join(', ');
    const params = [];
    users.rows.forEach(user => {
      params.push(user.id, title, message, link);
    });

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, link) VALUES ${values}`,
      params
    );

    res.json({
      success: true,
      message: `Đã gửi thông báo tới ${users.rows.length} người dùng`
    });
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};