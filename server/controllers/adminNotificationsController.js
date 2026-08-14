const { pool } = require('../config/database');

// Get notifications for admin
exports.getNotifications = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { page = 1, limit = 10, unreadOnly = false } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [adminId];

    if (unreadOnly === 'true') {
      query += ' AND is_read = false';
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = $1';
    const countParams = [adminId];
    let countResult;
    if (unreadOnly === 'true') {
      countQuery += ' AND is_read = false';
      countResult = await pool.query(countQuery, countParams);
    } else {
      countResult = await pool.query(countQuery, countParams);
    }

    // Get unread count
    const unreadResult = await pool.query(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND is_read = false',
      [adminId]
    );

    res.json({
      success: true,
      data: result.rows,
      unreadCount: parseInt(unreadResult.rows[0].unread),
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy thông báo' });
  }
};

// Create notification
exports.createNotification = async (req, res) => {
  try {
    const { admin_id, title, message, type = 'info', link } = req.body;

    if (!admin_id || !title || !message) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
    }

    const result = await pool.query(
      'INSERT INTO notifications (user_id, title, message, link, is_read, created_at) VALUES ($1, $2, $3, $4, false, NOW()) RETURNING *',
      [admin_id, title, message, link || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo thông báo' });
  }
};

// Mark as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật' });
  }
};

// Mark all as read
exports.markAllAsRead = async (req, res) => {
  try {
    const adminId = req.user.id;
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [adminId]
    );

    res.json({ success: true, message: 'Đánh dấu tất cả thông báo là đã đọc' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật' });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [id, adminId]
    );

    res.json({ success: true, message: 'Xóa thông báo thành công' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa thông báo' });
  }
};

module.exports = exports;
