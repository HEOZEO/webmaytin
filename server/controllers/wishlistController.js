const { pool } = require('../config/database');

exports.getWishlist = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        w.id as wishlist_id,
        p.id, 
        p.name, 
        p.price, 
        p.stock, 
        p.image_url, 
        p.brand_id, 
        p.category_id,
        b.name as brand_name, 
        c.name as category_name,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as review_count
       FROM wishlist w
       JOIN products p ON w.product_id = p.id
       LEFT JOIN brands b ON p.brand_id = b.id
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN reviews r ON p.id = r.product_id
       WHERE w.user_id = $1
       GROUP BY w.id, p.id, p.name, p.price, p.stock, p.image_url, p.brand_id, p.category_id, b.name, c.name
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách yêu thích' });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const { product_id } = req.body;

    const pid = Number(product_id);
    if (!Number.isInteger(pid) || pid <= 0) {
      return res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ' });
    }

    // Verify product exists and is not soft-deleted
    const productCheck = await pool.query(
      'SELECT id FROM products WHERE id = $1 AND deleted_at IS NULL',
      [pid]
    );
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
    }

    const exists = await pool.query(
      'SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2',
      [req.user.id, pid]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Sản ph�m đã có trong danh sách yêu thích' });
    }

    const result = await pool.query(
      'INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2) RETURNING *',
      [req.user.id, pid]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ success: false, message: 'Lỗi thêm vào danh sách yêu thích' });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const { product_id } = req.params;

    const pid = Number(product_id);
    if (!Number.isInteger(pid) || pid <= 0) {
      return res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ' });
    }

    const result = await pool.query(
      'DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2 RETURNING id',
      [req.user.id, pid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong danh sách yêu thích' });
    }

    res.json({ success: true, message: 'Đã xóa khỏi danh sách yêu thích' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa khỏi danh sách yêu thích' });
  }
};

exports.isInWishlist = async (req, res) => {
  try {
    const { product_id } = req.params;

    const pid = Number(product_id);
    if (!Number.isInteger(pid) || pid <= 0) {
      return res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ' });
    }

    const result = await pool.query(
      'SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2',
      [req.user.id, pid]
    );

    res.json({ success: true, isInWishlist: result.rows.length > 0 });
  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({ success: false, message: 'Lỗi kiểm tra' });
  }
};
