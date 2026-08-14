const { pool } = require('../config/database');
const { getCache, setCache } = require('../utils/cache');
const { toVNISO, parseVNDate, parseVNDateEnd, vnTz, VN_TZ } = require('../utils/timezone');

const CACHE_PREFIX = 'stats:dashboard';
const CACHE_TTL = 60; // 60s

// Dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    // Cache whole dashboard payload for 60s — backend hits DB at most 1×/min
    const cacheKey = 'overview';
    const cached = getCache(CACHE_PREFIX, cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    // Total Revenue (successful orders only - exclude cancelled and pending)
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(final_amount), 0) as total_revenue
       FROM orders
       WHERE status NOT IN ('cancelled', 'pending')`
    );

    // Total Orders
    const ordersResult = await pool.query(
      `SELECT COUNT(*) as total_orders FROM orders WHERE status != 'cancelled'`
    );

    // Today's Revenue — so sánh theo NGÀY VN, không phải UTC
    const todayRevenueResult = await pool.query(
      `SELECT COALESCE(SUM(final_amount), 0) as today_revenue,
              COUNT(*) as today_orders
       FROM orders
       WHERE DATE(${vnTz('created_at')}) = CURRENT_DATE
         AND status NOT IN ('cancelled', 'pending')`
    );

    // Active Customers (customers with orders in last 30 days — theo giờ VN)
    const activeCustomersResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as active_customers
       FROM orders
       WHERE ${vnTz('created_at')} >= NOW() AT TIME ZONE '${VN_TZ}' - INTERVAL '30 days'
         AND status != 'cancelled'`
    );

    // Low Stock Products (stock <= 5, not deleted)
    const lowStockResult = await pool.query(
      `SELECT COUNT(*)::int as low_stock_count FROM products WHERE stock <= 5 AND deleted_at IS NULL`
    );

    // Total Products (active, not deleted)
    const productsResult = await pool.query(
      `SELECT COUNT(*)::int as total_products FROM products WHERE deleted_at IS NULL`
    );

    // Total Customers
    const customersResult = await pool.query(
      `SELECT COUNT(*)::int as total_customers FROM users WHERE role = 'customer' AND is_active = true`
    );

    // Pending orders (pending + confirmed — awaiting fulfillment)
    const pendingOrdersResult = await pool.query(
      `SELECT COUNT(*)::int as pending_orders FROM orders WHERE status IN ('pending', 'confirmed')`
    );

    // Month revenue (this month for "Doanh thu tháng" card — theo tháng VN)
    const monthRevenueResult = await pool.query(
      `SELECT COALESCE(SUM(final_amount), 0) as month_revenue,
              COUNT(*) as month_orders
       FROM orders
       WHERE DATE_TRUNC('month', ${vnTz('created_at')}) = DATE_TRUNC('month', NOW() AT TIME ZONE '${VN_TZ}')
         AND status NOT IN ('cancelled')`
    );

    // Previous month revenue for comparison — theo tháng VN
    const prevMonthResult = await pool.query(
      `SELECT COALESCE(SUM(final_amount), 0) as prev_month_revenue
       FROM orders
       WHERE DATE_TRUNC('month', ${vnTz('created_at')}) = DATE_TRUNC('month', (NOW() AT TIME ZONE '${VN_TZ}') - INTERVAL '1 month')
         AND status NOT IN ('cancelled', 'pending')`
    );

    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue);
    const prevMonthRevenue = parseFloat(prevMonthResult.rows[0].prev_month_revenue);
    const revenueGrowth = prevMonthRevenue > 0
      ? ((totalRevenue - prevMonthRevenue) / prevMonthRevenue * 100).toFixed(1)
      : 0;

    const payload = {
      totalRevenue,
      monthRevenue: parseFloat(monthRevenueResult.rows[0].month_revenue),
      monthOrders: parseInt(monthRevenueResult.rows[0].month_orders),
      todayRevenue: parseFloat(todayRevenueResult.rows[0].today_revenue),
      todayOrders: parseInt(todayRevenueResult.rows[0].today_orders),
      totalOrders: parseInt(ordersResult.rows[0].total_orders),
      revenueGrowth: parseFloat(revenueGrowth),
      activeCustomers: parseInt(activeCustomersResult.rows[0].active_customers),
      lowStockCount: parseInt(lowStockResult.rows[0].low_stock_count),
      totalProducts: parseInt(productsResult.rows[0].total_products),
      totalCustomers: parseInt(customersResult.rows[0].total_customers),
      pendingOrders: parseInt(pendingOrdersResult.rows[0].pending_orders)
    };

    setCache(CACHE_PREFIX, cacheKey, payload, CACHE_TTL);

    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy thống kê' });
  }
};

// Top selling products - cache 60s
exports.getTopProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const cacheKey = `top:${limit}`;
    const cached = getCache(CACHE_PREFIX, cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const result = await pool.query(
      `SELECT
        p.id, p.name, p.price, p.stock, p.image_url,
        COALESCE(p.sold, 0) as sold,
        c.name as category_name, b.name as brand_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN brands b ON p.brand_id = b.id
       ORDER BY COALESCE(p.sold, 0) DESC
       LIMIT $1`,
      [limit]
    );

    setCache(CACHE_PREFIX, cacheKey, result.rows, CACHE_TTL);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy sản phẩm bán chạy' });
  }
};

// Recent orders - cache 60s
exports.getRecentOrders = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cacheKey = `recent:${limit}`;
    const cached = getCache(CACHE_PREFIX, cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const result = await pool.query(
      `SELECT
        o.id, o.final_amount as amount, o.status, o.created_at,
        u.full_name as customer_name,
        SUBSTRING(u.full_name FROM 1 FOR 2) as customer_initials,
        (
          SELECT p.name FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = o.id LIMIT 1
        ) as product_name,
        (
          SELECT SUM(oi.quantity) FROM order_items oi
          WHERE oi.order_id = o.id
        ) as quantity
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT $1`,
      [limit]
    );

    const orders = result.rows.map(order => ({
      ...order,
      status: mapOrderStatus(order.status)
    }));

    setCache(CACHE_PREFIX, cacheKey, orders, CACHE_TTL);
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get recent orders error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy đơn hàng gần đây' });
  }
};

// Helper function to map order status
function mapOrderStatus(status) {
  const statusMap = {
    'pending': 'pending',
    'confirmed': 'processing',
    'processing': 'processing',
    'shipping': 'processing',
    'delivered': 'completed',
    'cancelled': 'cancelled'
  };
  return statusMap[status] || status;
}

// Revenue by date range (1d/7d/30d/custom) — called by dashboard + analytics
// FIX: group by actual DATE not weekday name, AND convert to VN timezone
exports.getRevenueByGroup = async (req, res) => {
  try {
    const groupBy = (req.query.groupBy || 'day').toLowerCase();
    const { startDate, endDate } = req.query;

    let start, end;
    if (startDate && endDate) {
      // Frontend gửi YYYY-MM-DD theo giờ VN → parse đúng TZ
      start = parseVNDate(startDate);
      end = parseVNDateEnd(endDate);
    } else {
      end = new Date();
      if (groupBy === 'day') {
        start = new Date(end); start.setDate(start.getDate() - 7);
      } else if (groupBy === 'week') {
        start = new Date(end); start.setDate(start.getDate() - 30);
      } else {
        start = new Date(end); start.setDate(start.getDate() - 90);
      }
    }

    // Format date theo VN timezone để group label luôn khớp với frontend
    const dateFormat = groupBy === 'month'
      ? `TO_CHAR(DATE_TRUNC('month', ${vnTz('created_at')}), 'YYYY-MM')`
      : groupBy === 'quarter'
        ? `CONCAT('Q', CEIL(EXTRACT(MONTH FROM ${vnTz('created_at')})/3)::int)`
        : `TO_CHAR(${vnTz('created_at')}, 'YYYY-MM-DD')`;

    const result = await pool.query(
      `SELECT
        ${dateFormat} as day,
        COALESCE(SUM(final_amount), 0) as revenue,
        COUNT(*) as order_count,
        COALESCE(AVG(final_amount), 0) as avg_order_value,
        COALESCE(SUM(discount_amount), 0) as discount_amount
       FROM orders
       WHERE status NOT IN ('cancelled', 'pending')
         AND created_at >= $1
         AND created_at <= $2
       GROUP BY day
       ORDER BY day ASC
       LIMIT 200`,
      [start.toISOString(), end.toISOString()]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get revenue by group error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy doanh thu' });
  }
};

// Revenue weekly — FIXED: groups by actual date in VN timezone
exports.getRevenueWeekly = async (req, res) => {
  try {
    const cacheKey = 'rev:week';
    const cached = getCache(CACHE_PREFIX, cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const result = await pool.query(
      `SELECT
        TO_CHAR(${vnTz('created_at')}, 'YYYY-MM-DD') as day,
        COALESCE(SUM(final_amount), 0) as revenue,
        COUNT(*) as order_count
       FROM orders
       WHERE created_at >= NOW() - INTERVAL '7 days'
         AND status NOT IN ('cancelled', 'pending')
       GROUP BY day
       ORDER BY day ASC`
    );

    setCache(CACHE_PREFIX, cacheKey, result.rows, CACHE_TTL);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get revenue weekly error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy doanh thu tuần' });
  }
};

// Revenue monthly — group theo tháng VN
exports.getRevenueMonthly = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        TO_CHAR(${vnTz('created_at')}, 'Mon') as month,
        EXTRACT(MONTH FROM ${vnTz('created_at')}) as month_num,
        COALESCE(SUM(final_amount), 0) as revenue,
        COUNT(*) as order_count
       FROM orders
       WHERE EXTRACT(YEAR FROM ${vnTz('created_at')}) = EXTRACT(YEAR FROM NOW() AT TIME ZONE '${VN_TZ}')
         AND status NOT IN ('cancelled', 'pending')
       GROUP BY TO_CHAR(${vnTz('created_at')}, 'Mon'), EXTRACT(MONTH FROM ${vnTz('created_at')})
       ORDER BY EXTRACT(MONTH FROM ${vnTz('created_at')})`
    );
    res.json({ success: true, data: result.rows.map(r => ({ day: r.month, revenue: parseFloat(r.revenue), order_count: parseInt(r.order_count) })) });
  } catch (error) {
    console.error('Get revenue monthly error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy doanh thu tháng' });
  }
};

// Revenue quarterly — group theo quý VN
exports.getRevenueQuarterly = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        CONCAT('Q', CEIL(EXTRACT(MONTH FROM ${vnTz('created_at')})/3)::text) as quarter,
        CEIL(EXTRACT(MONTH FROM ${vnTz('created_at')})/3) as quarter_num,
        COALESCE(SUM(final_amount), 0) as revenue,
        COUNT(*) as order_count
       FROM orders
       WHERE EXTRACT(YEAR FROM ${vnTz('created_at')}) = EXTRACT(YEAR FROM NOW() AT TIME ZONE '${VN_TZ}')
         AND status NOT IN ('cancelled', 'pending')
       GROUP BY CEIL(EXTRACT(MONTH FROM ${vnTz('created_at')})/3)
       ORDER BY CEIL(EXTRACT(MONTH FROM ${vnTz('created_at')})/3)`
    );
    res.json({ success: true, data: result.rows.map(r => ({ day: r.quarter, revenue: parseFloat(r.revenue), order_count: parseInt(r.order_count) })) });
  } catch (error) {
    console.error('Get revenue quarterly error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy doanh thu quý' });
  }
};

// Helper function to map order status
exports.getAlerts = async (req, res) => {
  try {
    // Cache for 30s - polling from client every 30s won't thrash DB
    const cacheKey = 'alerts';
    const cached = getCache(CACHE_PREFIX, cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    // Low stock products (stock < 5)
    const lowStockResult = await pool.query(
      `SELECT id, name, stock, image_url
       FROM products
       WHERE stock < 5 AND deleted_at IS NULL
       ORDER BY stock ASC
       LIMIT 10`
    );

    // Expiring coupons (valid_to within next 7 days, still active)
    const expiringCouponsResult = await pool.query(
      `SELECT id, code, discount_percent, valid_to,
              GREATEST(0, CEIL(EXTRACT(EPOCH FROM (valid_to - NOW())) / 86400)::int) as days_left
       FROM coupons
       WHERE is_active = true
         AND valid_to > NOW()
         AND valid_to <= NOW() + INTERVAL '7 days'
       ORDER BY valid_to ASC
       LIMIT 10`
    );

    // Pending bank-transfer payment requests (awaiting admin approval)
    const pendingPaymentsResult = await pool.query(
      `SELECT COUNT(*) as count FROM payment_requests WHERE status = 'pending'`
    );

    // Pending orders awaiting fulfilment (informational)
    const pendingOrdersResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'confirmed')`
    );

    const payload = {
      lowStockProducts: lowStockResult.rows,
      lowStockCount: lowStockResult.rows.length,
      expiringCoupons: expiringCouponsResult.rows,
      expiringCouponsCount: expiringCouponsResult.rows.length,
      pendingPaymentsCount: parseInt(pendingPaymentsResult.rows[0].count),
      pendingOrdersCount: parseInt(pendingOrdersResult.rows[0].count)
    };

    setCache(CACHE_PREFIX, cacheKey, payload, 30);
    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy cảnh báo' });
  }
};

module.exports = exports;
