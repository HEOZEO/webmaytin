const { pool } = require('../config/database');
const { sanitizeHtml, sanitizeInput } = require('../utils/sanitizer');

exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT r.*, u.full_name, u.email
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1 AND r.is_hidden = false
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM reviews WHERE product_id = $1 AND is_hidden = false',
      [productId]
    );

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
    console.error('Get reviews error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy đánh giá' });
  }
};

exports.createReview = async (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;
    const user_id = req.user.id;

    // Check if user has purchased this product
    const purchaseCheck = await pool.query(
      `SELECT o.id 
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'delivered'`,
      [user_id, product_id]
    );

    if (purchaseCheck.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn chỉ có thể đánh giá sản phẩm đã mua và đã giao' 
      });
    }

    // Check if user already reviewed
    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2',
      [user_id, product_id]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bạn đã đánh giá sản phẩm này rồi' 
      });
    }

    // Sanitize user comment (XSS) + length cap to prevent storage abuse
    const safeComment = String(comment || '').slice(0, 2000);
    const sanitizedComment = sanitizeHtml(safeComment);

    const result = await pool.query(
      `INSERT INTO reviews (user_id, product_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, product_id, rating, sanitizedComment]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo đánh giá' });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const user_id = req.user.id;

    // Sanitize user comment
    const sanitizedComment = comment ? sanitizeHtml(comment) : undefined;

    const result = await pool.query(
      `UPDATE reviews 
       SET rating = $1, comment = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [rating, sanitizedComment, id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật đánh giá' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const role = req.user.role;

    let query = 'DELETE FROM reviews WHERE id = $1';
    const params = [id];

    // Only allow user to delete their own review unless admin
    if (role !== 'admin') {
      query += ' AND user_id = $2';
      params.push(user_id);
    }

    query += ' RETURNING *';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
    }

    res.json({
      success: true,
      message: 'Xóa đánh giá thành công'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa đánh giá' });
  }
};
