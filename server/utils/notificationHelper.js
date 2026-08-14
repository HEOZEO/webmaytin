const { pool } = require('../config/database');

/**
 * Create notification for a user
 * @param {number} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} link - Optional link
 */
const createNotification = async (userId, title, message, link = null) => {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, link) VALUES ($1, $2, $3, $4)',
      [userId, title, message, link]
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

/**
 * Broadcast notification to multiple users
 * @param {Array} userIds - Array of user IDs
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} link - Optional link
 */
const broadcastNotification = async (userIds, title, message, link = null) => {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) return;

    const values = userIds.map((_, index) => `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4})`).join(', ');
    const params = [];
    userIds.forEach(userId => {
      params.push(userId, title, message, link);
    });

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, link) VALUES ${values}`,
      params
    );
  } catch (error) {
    console.error('Error broadcasting notifications:', error);
  }
};

/**
 * Order status change notifications
 */
const orderStatusNotifications = {
  pending: 'Đơn hàng đã được tạo',
  confirmed: 'Đơn hàng đã được xác nhận',
  packing: 'Đơn hàng đang được đóng gói',
  shipping: 'Đơn hàng đang được vận chuyển',
  delivered: 'Đơn hàng đã được giao thành công',
  cancelled: 'Đơn hàng đã bị hủy'
};

const getOrderStatusMessage = (status, orderId) => {
  const statusText = orderStatusNotifications[status];
  return statusText ? `${statusText} - Đơn hàng #${orderId}` : `Cập nhật trạng thái đơn hàng #${orderId}`;
};

module.exports = {
  createNotification,
  broadcastNotification,
  orderStatusNotifications,
  getOrderStatusMessage
};