const { pool } = require('../config/database');
const { toVNISO, parseVNDate, parseVNDateEnd, vnTz, VN_TZ } = require('../utils/timezone');

// Get revenue by date range — group theo VN timezone
exports.getRevenueByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp startDate và endDate' });
    }

    const groupFormats = {
      day: `TO_CHAR(${vnTz('o.created_at')}, 'YYYY-MM-DD')`,
      week: `TO_CHAR(DATE_TRUNC('week', ${vnTz('o.created_at')}), 'YYYY-MM-DD')`,
      month: `TO_CHAR(DATE_TRUNC('month', ${vnTz('o.created_at')}), 'YYYY-MM')`,
      quarter: `TO_CHAR(DATE_TRUNC('quarter', ${vnTz('o.created_at')}), 'YYYY-Q')`
    };

    const groupFormat = groupFormats[groupBy] || groupFormats.day;

    // Parse YYYY-MM-DD theo giờ VN để so sánh chính xác
    const start = parseVNDate(startDate);
    const end = parseVNDateEnd(endDate);

    const result = await pool.query(`
      SELECT
        ${groupFormat} as period,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.final_amount), 0) as revenue,
        COALESCE(AVG(o.final_amount), 0) as avg_order_value,
        COALESCE(SUM(o.discount_amount), 0) as discount_amount
      FROM orders o
      WHERE o.created_at >= $1 AND o.created_at <= $2 AND o.status != 'cancelled'
      GROUP BY ${groupFormat}
      ORDER BY period
    `, [start.toISOString(), end.toISOString()]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get revenue by date range error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy dữ liệu doanh thu', error: error.message });
  }
};

// Get top selling products
exports.getTopSellingProducts = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    let query = `
      SELECT
        p.id, p.name, p.price, p.brand_id, p.category_id,
        SUM(oi.quantity) as total_sold,
        SUM(oi.quantity * oi.price) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count,
        b.name as brand_name,
        c.name as category_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
    `;

    const params = [];

    if (startDate && endDate) {
      const s = parseVNDate(startDate);
      const e = parseVNDateEnd(endDate);
      query += ` AND o.created_at >= $${params.length + 1} AND o.created_at <= $${params.length + 2}`;
      params.push(s.toISOString(), e.toISOString());
    }

    query += ` GROUP BY p.id, p.name, p.price, p.brand_id, p.category_id, b.name, c.name
               ORDER BY total_sold DESC
               LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get top selling products error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy top sản phẩm bán chạy', error: error.message });
  }
};

// Get order status distribution
exports.getOrderStatusDistribution = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = `
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(final_amount), 0) as total_amount,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM orders
      WHERE 1=1
    `;

    const params = [];

    if (startDate && endDate) {
      const s = parseVNDate(startDate);
      const e = parseVNDateEnd(endDate);
      query += ` AND created_at >= $${params.length + 1} AND created_at <= $${params.length + 2}`;
      params.push(s.toISOString(), e.toISOString());
    }

    query += ` GROUP BY status ORDER BY count DESC`;

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get order status distribution error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy phân bố trạng thái đơn hàng', error: error.message });
  }
};

// Get category sales
exports.getCategorySales = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    let query = `
      SELECT
        c.id, c.name,
        COUNT(DISTINCT oi.order_id) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.price) as total_revenue,
        ROUND(SUM(oi.quantity * oi.price) * 100.0 / SUM(SUM(oi.quantity * oi.price)) OVER (), 2) as percentage
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
    `;

    const params = [];

    if (startDate && endDate) {
      const s = parseVNDate(startDate);
      const e = parseVNDateEnd(endDate);
      query += ` AND o.created_at >= $${params.length + 1} AND o.created_at <= $${params.length + 2}`;
      params.push(s.toISOString(), e.toISOString());
    }

    query += ` GROUP BY c.id, c.name
               ORDER BY total_revenue DESC
               LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get category sales error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy doanh số danh mục', error: error.message });
  }
};

// Get brand sales
exports.getBrandSales = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    let query = `
      SELECT
        b.id, b.name,
        COUNT(DISTINCT oi.order_id) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.price) as total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN brands b ON p.brand_id = b.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
    `;

    const params = [];

    if (startDate && endDate) {
      const s = parseVNDate(startDate);
      const e = parseVNDateEnd(endDate);
      query += ` AND o.created_at >= $${params.length + 1} AND o.created_at <= $${params.length + 2}`;
      params.push(s.toISOString(), e.toISOString());
    }

    query += ` GROUP BY b.id, b.name
               ORDER BY total_revenue DESC
               LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get brand sales error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy doanh số thương hiệu', error: error.message });
  }
};

// Get customer acquisition
exports.getCustomerAcquisition = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const groupFormats = {
      day: `TO_CHAR(${vnTz('u.created_at')}, 'YYYY-MM-DD')`,
      week: `TO_CHAR(DATE_TRUNC('week', ${vnTz('u.created_at')}), 'YYYY-MM-DD')`,
      month: `TO_CHAR(DATE_TRUNC('month', ${vnTz('u.created_at')}), 'YYYY-MM')`
    };

    const groupFormat = groupFormats[groupBy] || groupFormats.day;

    let query = `
      SELECT
        ${groupFormat} as period,
        COUNT(*) as new_customers,
        COUNT(CASE WHEN o.id IS NOT NULL THEN 1 END) as customers_with_orders,
        COALESCE(SUM(o.final_amount), 0) as customer_revenue
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.role = 'customer'
    `;

    const params = [];

    if (startDate && endDate) {
      const s = parseVNDate(startDate);
      const e = parseVNDateEnd(endDate);
      query += ` AND u.created_at >= $${params.length + 1} AND u.created_at <= $${params.length + 2}`;
      params.push(s.toISOString(), e.toISOString());
    }

    query += ` GROUP BY ${groupFormat} ORDER BY period`;

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get customer acquisition error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy dữ liệu khách hàng mới', error: error.message });
  }
};

// Get summary statistics
exports.getSummaryStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let whereClause = `WHERE o.status != 'cancelled'`;
    const params = [];

    if (startDate && endDate) {
      const s = parseVNDate(startDate);
      const e = parseVNDateEnd(endDate);
      whereClause += ` AND o.created_at >= $${params.length + 1} AND o.created_at <= $${params.length + 2}`;
      params.push(s.toISOString(), e.toISOString());
    }

    const result = await pool.query(`
      SELECT
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT o.user_id) as total_customers,
        COALESCE(SUM(o.final_amount), 0) as total_revenue,
        COALESCE(SUM(o.discount_amount), 0) as total_discount,
        COALESCE(AVG(o.final_amount), 0) as avg_order_value,
        COALESCE(SUM(oi.quantity), 0) as total_products_sold,
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as delivered_orders
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
    `, params);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get summary stats error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy thống kê tóm tắt', error: error.message });
  }
};
