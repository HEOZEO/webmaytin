const { pool } = require('../config/database');

exports.getDashboard = async (req, res) => {
  try {
    // Total revenue
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(final_amount), 0) as total_revenue
       FROM orders WHERE status != 'cancelled'`
    );

    // Total orders
    const ordersResult = await pool.query(
      'SELECT COUNT(*) as total_orders FROM orders'
    );

    // Total products
    const productsResult = await pool.query(
      'SELECT COUNT(*) as total_products FROM products'
    );

    // Total users
    const usersResult = await pool.query(
      "SELECT COUNT(*) as total_users FROM users WHERE role = 'customer'"
    );

    // Pending orders
    const pendingResult = await pool.query(
      "SELECT COUNT(*) as pending_orders FROM orders WHERE status = 'pending'"
    );

    // Low stock products
    const lowStockResult = await pool.query(
      'SELECT COUNT(*) as low_stock FROM products WHERE stock < 10'
    );

    res.json({
      success: true,
      data: {
        total_revenue: parseFloat(revenueResult.rows[0].total_revenue),
        total_orders: parseInt(ordersResult.rows[0].total_orders),
        total_products: parseInt(productsResult.rows[0].total_products),
        total_users: parseInt(usersResult.rows[0].total_users),
        pending_orders: parseInt(pendingResult.rows[0].pending_orders),
        low_stock: parseInt(lowStockResult.rows[0].low_stock)
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy thống kê dashboard' });
  }
};

exports.getRevenue = async (req, res) => {
  try {
    const { period = 'day', start_date, end_date } = req.query;

    let dateFormat;
    let groupBy;

    switch (period) {
      case 'week':
        dateFormat = 'YYYY-IW';
        groupBy = "TO_CHAR(created_at, 'YYYY-IW')";
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        groupBy = "TO_CHAR(created_at, 'YYYY-MM')";
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
        groupBy = "DATE(created_at)";
    }

    let query = `
      SELECT ${groupBy} as period,
             COALESCE(SUM(final_amount), 0) as revenue,
             COUNT(*) as order_count
      FROM orders
      WHERE status != 'cancelled'
    `;

    const params = [];
    let paramIndex = 1;

    if (start_date) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    query += ` GROUP BY ${groupBy} ORDER BY period DESC LIMIT 30`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy thống kê doanh thu' });
  }
};

exports.getInventory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.stock, p.price, b.name as brand_name, c.name as category_name
       FROM products p
       LEFT JOIN brands b ON p.brand_id = b.id
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY p.stock ASC
       LIMIT 50`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy báo cáo tồn kho' });
  }
};

exports.getBestSellers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `SELECT p.id, p.name, p.price, p.image_url, p.sold, b.name as brand_name,
              COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
       FROM products p
       LEFT JOIN brands b ON p.brand_id = b.id
       LEFT JOIN order_items oi ON p.id = oi.product_id
       LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
       GROUP BY p.id, b.name
       ORDER BY p.sold DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get best sellers error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy sản phẩm bán chạy' });
  }
};
