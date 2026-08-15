const { pool } = require('../config/database');

const adminReviewsController = {
  // Lấy danh sách đánh giá
  getAllReviews: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      
      let queryStr = `
        SELECT r.*, u.full_name as user_name, u.email as user_email, p.name as product_name 
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        JOIN products p ON r.product_id = p.id
        WHERE 1=1
      `;
      let countQueryStr = `
        SELECT COUNT(*) as total 
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        JOIN products p ON r.product_id = p.id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramCount = 1;

      if (search) {
        queryStr += ` AND (u.full_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR p.name ILIKE $${paramCount} OR r.comment ILIKE $${paramCount})`;
        countQueryStr += ` AND (u.full_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR p.name ILIKE $${paramCount} OR r.comment ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
        paramCount++;
      }

      queryStr += ` ORDER BY r.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      queryParams.push(limit, offset);

      const [countResult, reviewsResult] = await Promise.all([
        pool.query(countQueryStr, queryParams.slice(0, paramCount - 1)),
        pool.query(queryStr, queryParams)
      ]);

      const totalItems = parseInt(countResult.rows[0].total);
      
      res.json({
        success: true,
        data: reviewsResult.rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalItems / limit),
          totalItems,
          itemsPerPage: limit
        }
      });
    } catch (err) {
      console.error('Lỗi khi lấy danh sách đánh giá:', err);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // Ẩn/Hiện đánh giá
  toggleVisibility: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Kiểm tra đánh giá có tồn tại
      const checkResult = await pool.query('SELECT is_hidden FROM reviews WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
      }

      const currentStatus = checkResult.rows[0].is_hidden;
      const newStatus = !currentStatus;

      await pool.query('UPDATE reviews SET is_hidden = $1, updated_at = NOW() WHERE id = $2', [newStatus, id]);
      
      res.json({ 
        success: true, 
        message: newStatus ? 'Đã ẩn đánh giá' : 'Đã hiện đánh giá',
        is_hidden: newStatus 
      });
    } catch (err) {
      console.error('Lỗi cập nhật đánh giá:', err);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // Xoá đánh giá
  deleteReview: async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query('DELETE FROM reviews WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
      }

      res.json({ success: true, message: 'Đã xóa đánh giá thành công' });
    } catch (err) {
      console.error('Lỗi khi xóa đánh giá:', err);
      res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  }
};

module.exports = adminReviewsController;
