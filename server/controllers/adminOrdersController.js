const { pool } = require('../config/database');
const { sendEmail } = require('../config/email');
const { logInventoryTransaction } = require('../utils/inventory');
const { sanitizeInput } = require('../utils/sanitizer');

// Helper: restore coupon_usage khi hủy đơn (dùng cho cả admin cancel & updateOrderStatus -> cancelled)
// - Bỏ đánh dấu is_used trên user_coupons (nếu có)
// - Cộng used_count của coupon -1
// - Ghi log activity
async function restoreCouponUsage(client, { orderId, adminId, reason }) {
  try {
    const orderRow = await client.query(
      `SELECT coupon_id, user_id, discount_amount FROM orders WHERE id = $1::int`,
      [orderId]
    );
    const order = orderRow.rows[0];
    if (!order || !order.coupon_id) return; // không có coupon thì bỏ qua

    // 1. Mở khóa user_coupons (nếu có record) để user có thể dùng lại mã
    await client.query(
      `UPDATE user_coupons
         SET is_used = false, used_at = NULL, used_order_id = NULL, updated_at = NOW()
       WHERE user_id = $1::int AND coupon_id = $2::int AND used_order_id = $3::int
         AND is_used = true`,
      [order.user_id, order.coupon_id, orderId]
    );

    // 2. Giảm used_count đúng bằng discount_amount (chỉ giảm 1 lần / 1 coupon_usage)
    await client.query(
      `UPDATE coupons SET used_count = GREATEST(used_count - 1, 0)
       WHERE id = $1::int`,
      [order.coupon_id]
    );

    // 3. Ghi log activity
    if (adminId) {
      await client.query(
        `INSERT INTO activity_logs (user_id, action, description)
         VALUES ($1::int, $2, $3)`,
        [adminId, 'COUPON_RESTORE', `Khôi phục mã giảm giá cho đơn #${orderId} bị hủy${reason ? ` (lý do: ${reason})` : ''}`]
      );
    }
  } catch (e) {
    // Không chặn luồng chính, chỉ log warning
    console.warn('restoreCouponUsage warning:', e.message);
  }
}

// Create order by admin (for manual orders or phone orders)
exports.createOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      customer_name, customer_phone, customer_email, shipping_address,
      items, payment_method = 'cod', notes, district_id
    } = req.body;

    // Validate required fields
    if (!customer_phone) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Số điện thoại khách hàng là bắt buộc' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Danh sách sản phẩm không được trống' });
    }

    // Calculate shipping fee
    let shippingFee = 0;
    if (district_id) {
      const districtCheck = await client.query(
        'SELECT id, zone, shipping_fee FROM districts WHERE id = $1',
        [district_id]
      );
      if (districtCheck.rows.length > 0) {
        shippingFee = Number(districtCheck.rows[0].shipping_fee);
      }
    }

    // Get products from database
    const productIds = items.map(i => Number(i.product_id)).filter(Boolean);
    const productsResult = await client.query(
      `SELECT id, name, price, stock, is_active, deleted_at
       FROM products WHERE id = ANY($1::int[])`,
      [productIds]
    );

    const productsMap = new Map(productsResult.rows.map(p => [p.id, p]));

    // Calculate total and validate stock
    let total_amount = 0;
    const orderItems = [];

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (!productId || !quantity || quantity <= 0) {
        throw new Error('Thông tin sản phẩm không hợp lệ');
      }

      const product = productsMap.get(productId);
      if (!product) {
        throw new Error(`Sản phẩm #${productId} không tồn tại`);
      }
      if (product.deleted_at || !product.is_active) {
        throw new Error(`Sản phẩm "${product.name}" không khả dụng`);
      }
      if (Number(product.stock) < quantity) {
        throw new Error(`Sản phẩm "${product.name}" không đủ hàng (còn ${product.stock})`);
      }

      total_amount += Number(product.price) * quantity;
      orderItems.push({
        product_id: productId,
        quantity,
        price: Number(product.price),
        name: product.name
      });
    }

    const final_amount = total_amount + shippingFee;

    // Find or create user by phone
    let userId = null;
    const existingUser = await client.query(
      'SELECT id FROM users WHERE phone = $1',
      [customer_phone]
    );

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
    } else {
      // Create guest user
      const newUser = await client.query(
        `INSERT INTO users (full_name, phone, email, address, role, is_active)
         VALUES ($1, $2, $3, $4, 'customer', true) RETURNING id`,
        [
          sanitizeInput(customer_name || 'Khách hàng'),
          customer_phone,
          customer_email || null,
          sanitizeInput(shipping_address || '')
        ]
      );
      userId = newUser.rows[0].id;
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders
       (user_id, total_amount, discount_amount, final_amount, shipping_address,
        phone, payment_method, notes, status, shipping_fee, district_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)
       RETURNING *`,
      [
        userId, total_amount, 0, final_amount,
        sanitizeInput(shipping_address || ''),
        customer_phone, payment_method,
        sanitizeInput(notes || ''),
        shippingFee, district_id || null
      ]
    );

    const order = orderResult.rows[0];

    // Create order items and update stock
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.quantity, item.price]
      );

      // Update stock
      await client.query(
        `UPDATE products SET stock = stock - $1, sold = sold + $1
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Create payment record
    await client.query(
      `INSERT INTO payments (order_id, payment_method, payment_status, amount)
       VALUES ($1, $2, $3, $4)`,
      [order.id, payment_method, payment_method === 'cod' ? 'pending' : 'completed', final_amount]
    );

    // Log activity — ghi nhận ai đã tạo đơn
    await client.query(
      `INSERT INTO activity_logs (user_id, action, description)
       VALUES ($1, $2, $3)`,
      [
        req.user.id,
        `${req.user.role.toUpperCase()}_CREATE_ORDER`,
        `[${req.user.role}] ${req.user.full_name || req.user.email} đã tạo đơn hàng #${order.id} cho khách ${customer_name || customer_phone}`
      ]
    ).catch(err => console.warn('Activity log error:', err.message));

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Tạo đơn hàng thành công',
      data: order,
      createdBy: { id: req.user.id, name: req.user.full_name || req.user.email, role: req.user.role }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi tạo đơn hàng' });
  } finally {
    client.release();
  }
};

// Get all orders with filters
exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', startDate = '', endDate = '', search = '', paymentMethod = '', paymentStatus = '', includeDeleted = '' } = req.query;
    const offset = (page - 1) * limit;

    // WHERE conditions for orders table (aliased as o2 in subquery, o in outer)
    let orderWhere = [];
    let params = [];

    if (status) {
      orderWhere.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    if (paymentMethod) {
      orderWhere.push(`payment_method = $${params.length + 1}`);
      params.push(paymentMethod);
    }
    if (startDate) {
      orderWhere.push(`created_at >= $${params.length + 1}`);
      params.push(startDate);
    }
    if (endDate) {
      orderWhere.push(`created_at <= $${params.length + 1}`);
      params.push(endDate + ' 23:59:59');
    }
    // Soft-delete filter: mặc định loại trừ đơn đã xóa mềm
    if (includeDeleted !== 'true') {
      orderWhere.push('deleted_at IS NULL');
    }

    // paymentStatus filter — thêm qua subquery EXISTS để tránh nhân dòng khi LEFT JOIN
    if (paymentStatus) {
      const psIdx = params.length + 1;
      orderWhere.push(`EXISTS (
        SELECT 1 FROM payments pmf
        WHERE pmf.order_id = orders.id AND pmf.payment_status = $${psIdx}
      )`);
      params.push(paymentStatus);
    }

    const orderWhereStr = orderWhere.length > 0 ? `WHERE ${orderWhere.join(' AND ')}` : '';

    // Search — uses users u, must be in outer query
    const hasSearch = !!search;
    const searchParamIdx = params.length + 1;
    if (hasSearch) {
      params.push(`%${search}%`);
    }

    // Count — GROUP BY avoids LEFT JOIN row duplication
    const countResult = await pool.query(
      `SELECT COUNT(*)::int as total FROM orders ${orderWhereStr}`,
      params
    );
    const totalCount = countResult.rows[0].total;

    // Pagination indices
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    params.push(Number(limit), Number(offset));

    // Main query: subquery orders → then LEFT JOIN everything else
    const searchWhere = hasSearch
      ? `AND (o.id::text ILIKE $${searchParamIdx} OR u.full_name ILIKE $${searchParamIdx} OR u.email ILIKE $${searchParamIdx} OR u.phone ILIKE $${searchParamIdx})`
      : '';

    const query = `
      SELECT
        o.id, o.user_id, o.total_amount, o.discount_amount, o.final_amount,
        o.shipping_fee, o.shipping_address, o.phone, o.notes,
        o.status, o.created_at, o.updated_at, o.payment_method, o.deleted_at,
        o.recipient_name,
        COALESCE(NULLIF(o.recipient_name, ''), u.full_name) AS full_name,
        u.email, u.phone as user_phone,
        COALESCE(ic.item_count, 0) as item_count,
        fp.name as first_item_name,
        fp.image_url as first_item_image,
        pr.id as payment_request_id,
        pr.status as payment_request_status,
        pr.bill_image_url as bill_image_url,
        pm.payment_status
      FROM (
        SELECT id, user_id, total_amount, discount_amount, final_amount,
               shipping_fee, shipping_address, phone, notes,
               status, created_at, updated_at, payment_method, deleted_at,
               recipient_name
        FROM orders
        ${orderWhereStr}
        ORDER BY id DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      ) o
      LEFT JOIN users u ON o.user_id = u.id
      ${hasSearch ? searchWhere : ''}
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as item_count
        FROM order_items
        WHERE order_id = o.id
      ) ic ON true
      LEFT JOIN LATERAL (
        SELECT name, image_url
        FROM order_items
        JOIN products p ON order_items.product_id = p.id
        WHERE order_items.order_id = o.id
        ORDER BY order_items.id ASC
        LIMIT 1
      ) fp ON true
      LEFT JOIN LATERAL (
        SELECT id, status, bill_image_url
        FROM payment_requests
        WHERE order_id = o.id
        ORDER BY id DESC
        LIMIT 1
      ) pr ON true
      LEFT JOIN LATERAL (
        SELECT payment_status
        FROM payments
        WHERE order_id = o.id
        ORDER BY id DESC
        LIMIT 1
      ) pm ON true
      ORDER BY o.id DESC
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đơn hàng', error: error.message });
  }
};

// Get order details
exports.getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = Number(id);

    const orderResult = await pool.query(
      `SELECT o.*, u.full_name, u.email, u.phone, u.address,
              COALESCE(NULLIF(o.recipient_name, ''), u.full_name) AS display_recipient_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1::int`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không tìm thấy' });
    }

    const itemsResult = await pool.query(
      `SELECT oi.*, p.name, p.image_url, p.price
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1::int`,
      [orderId]
    );

    // Join payment_requests (BANK_TRANSFER orders) to expose bill + payment status
    const paymentRequestResult = await pool.query(
      `SELECT id, bill_image_url, status, admin_note, amount, created_at, reviewed_at
       FROM payment_requests WHERE order_id = $1::int`,
      [orderId]
    );

    // Join payments table for legacy payment_status column
    const paymentsResult = await pool.query(
      `SELECT id, payment_method, payment_status, amount, paid_at
       FROM payments WHERE order_id = $1::int`,
      [orderId]
    );

    res.json({
      success: true,
      data: {
        ...orderResult.rows[0],
        items: itemsResult.rows,
        payment_request: paymentRequestResult.rows[0] || null,
        payments: paymentsResult.rows
      }
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết đơn hàng', error: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const orderId = Number(id);
    const { status, notes } = req.body;

    // Validate status transition - get order first
    const orderResult = await client.query(
      `SELECT o.*, u.email, u.full_name FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1::int`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Đơn hàng không tìm thấy' });
    }

    const order = orderResult.rows[0];
    const oldStatus = order.status;

    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['packing', 'cancelled'],
      packing: ['shipping', 'cancelled'],
      shipping: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: []
    };

    if (!validTransitions[oldStatus]?.includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển từ "${oldStatus}" sang "${status}"`
      });
    }

    // Update order status
    const updateResult = await client.query(
      `UPDATE orders SET status = $1::varchar, updated_at = NOW()
       WHERE id = $2::int RETURNING *`,
      [status, orderId]
    );

    // Auto-update payment status based on order status
    if (['delivered', 'cancelled'].includes(status)) {
      const paymentStatusTarget = status === 'delivered' ? 'paid' : 'cancelled';
      await client.query(
        `UPDATE payments
           SET payment_status = $1::varchar, updated_at = NOW()
         WHERE order_id = $2::int AND payment_status = 'pending'`,
        [paymentStatusTarget, orderId]
      );
    }

    // If status changed to cancelled, restore stock
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      const itemsResult = await client.query(
        `SELECT oi.product_id, oi.quantity FROM order_items oi WHERE oi.order_id = $1::int`,
        [orderId]
      );

      for (const item of itemsResult.rows) {
        await client.query(
          `UPDATE products SET stock = stock + $1 WHERE id = $2::int`,
          [item.quantity, item.product_id]
        );

        await logInventoryTransaction(client, {
          productId: item.product_id,
          quantityChange: item.quantity,
          reason: 'order_cancelled',
          adminId: req.user.id,
          notes: `Order #${orderId} cancelled`
        });
      }

      // Khôi phục mã giảm giá đã dùng (nếu có)
      await restoreCouponUsage(client, { orderId, adminId: req.user.id, reason: notes });
    }

    // QUAN TRỌNG: Stock đã được trừ tự động trong orderController.createOrder (line 105-111)
    // KHI TẠO ĐƠN HÀNG. Không trừ lại ở đây để tránh mất stock 2 lần.
    // Chỉ ghi log inventory transaction khi admin xác nhận đơn.
    if (oldStatus === 'pending' && status === 'confirmed') {
      const itemsResult = await client.query(
        `SELECT oi.product_id, oi.quantity FROM order_items oi WHERE oi.order_id = $1::int`,
        [orderId]
      );

      for (const item of itemsResult.rows) {
        await logInventoryTransaction(client, {
          productId: item.product_id,
          quantityChange: 0,
          reason: 'order_confirmed',
          adminId: req.user.id,
          notes: `Order #${orderId} confirmed (stock already deducted at creation)`
        });
      }
    }

    // Send email notification
    const statusMessages = {
      confirmed: 'Đơn hàng của bạn đã được xác nhận và sẽ được chuẩn bị gửi',
      packing: 'Đơn hàng của bạn đang được đóng gói',
      shipping: 'Đơn hàng của bạn đang được vận chuyển',
      delivered: 'Đơn hàng của bạn đã được giao thành công',
      cancelled: 'Đơn hàng của bạn đã bị hủy'
    };

    if (statusMessages[status] && order.email) {
      try {
        await sendEmail({
          to: order.email,
          subject: `Cập nhật đơn hàng #${orderId}`,
          html: `
            <h2>Cập nhật đơn hàng</h2>
            <p>Kính chào ${order.full_name || 'Quý khách'},</p>
            <p>${statusMessages[status]}</p>
            <p>Mã đơn hàng: <strong>#${orderId}</strong></p>
            <p>Tổng tiền: <strong>${(order.final_amount || 0).toLocaleString('vi-VN')} VND</strong></p>
            ${notes ? `<p>Ghi chú: ${notes}</p>` : ''}
            <p>Cảm ơn bạn đã mua hàng!</p>
          `
        });
      } catch (emailErr) {
        console.warn('Email sending failed for order update (ignored):', emailErr.message);
      }
    }

    // Log activity — ghi nhận nhân viên/admin đã cập nhật trạng thái đơn
    await client.query(
      `INSERT INTO activity_logs (user_id, action, description)
       VALUES ($1, $2, $3)`,
      [
        req.user.id,
        `${req.user.role.toUpperCase()}_UPDATE_ORDER_STATUS`,
        `[${req.user.role}] ${req.user.full_name || req.user.email} đã cập nhật đơn #${orderId}: ${oldStatus} → ${status}${notes ? ` | Ghi chú: ${notes}` : ''}`
      ]
    ).catch(err => console.warn('Activity log error:', err.message));

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công',
      data: updateResult.rows[0],
      updatedBy: { id: req.user.id, name: req.user.full_name || req.user.email, role: req.user.role }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái đơn hàng', error: error.message });
  } finally {
    client.release();
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const orderId = Number(id);
    const { reason } = req.body;

    const orderResult = await client.query(
      `SELECT o.*, u.email, u.full_name FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1::int AND o.status != 'cancelled'`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Không thể hủy đơn hàng này' });
    }

    const order = orderResult.rows[0];

    // Update order status to cancelled + lưu cancel_reason, cancelled_by, cancelled_at
    await client.query(
      `UPDATE orders SET
         status = 'cancelled',
         cancel_reason = $2,
         cancelled_by = $3,
         cancelled_at = NOW(),
         updated_at = NOW()
       WHERE id = $1::int`,
      [orderId, reason || null, req.user.id]
    );

    // Restore stock
    const itemsResult = await client.query(
      `SELECT oi.product_id, oi.quantity FROM order_items oi WHERE oi.order_id = $1::int`,
      [orderId]
    );

    for (const item of itemsResult.rows) {
      await client.query(
        `UPDATE products SET stock = stock + $1 WHERE id = $2::int`,
        [item.quantity, item.product_id]
      );

      await logInventoryTransaction(client, {
        productId: item.product_id,
        quantityChange: item.quantity,
        reason: 'order_cancelled',
        adminId: req.user.id,
        notes: `Order #${orderId} cancelled - ${reason || 'No reason'}`
      });
    }

    // Khôi phục mã giảm giá đã dùng (nếu có)
    await restoreCouponUsage(client, { orderId, adminId: req.user.id, reason });

    // Nếu thanh toán đang pending → đánh dấu cancelled
    await client.query(
      `UPDATE payments SET payment_status = 'cancelled', updated_at = NOW()
       WHERE order_id = $1::int AND payment_status = 'pending'`,
      [orderId]
    );

    // Send cancellation email
    if (order.email) {
      await sendEmail({
        to: order.email,
        subject: `Đơn hàng #${orderId} đã bị hủy`,
        html: `
          <h2>Hủy đơn hàng</h2>
          <p>Kính chào ${order.full_name},</p>
          <p>Đơn hàng của bạn đã bị hủy.</p>
          <p>Mã đơn hàng: <strong>#${orderId}</strong></p>
          <p>Lý do: ${reason || 'Không có'}</p>
          <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
        `
      });
    }

    // Log activity — ghi nhận ai đã hủy đơn
    await client.query(
      `INSERT INTO activity_logs (user_id, action, description)
       VALUES ($1::int, $2::varchar, $3::text)`,
      [
        req.user.id,
        `${req.user.role.toUpperCase()}_CANCEL_ORDER`,
        `[${req.user.role}] ${req.user.full_name || req.user.email} đã hủy đơn #${orderId}${reason ? ` | Lý do: ${reason}` : ''}`
      ]
    ).catch(err => console.warn('Activity log error:', err.message));

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Đơn hàng đã bị hủy thành công',
      cancelledBy: { id: req.user.id, name: req.user.full_name || req.user.email, role: req.user.role }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: 'Lỗi hủy đơn hàng', error: error.message });
  } finally {
    client.release();
  }
};

// Get recent orders (for dashboard)
exports.getRecentOrders = async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    
    const result = await pool.query(
      `SELECT 
        o.id, o.status, o.final_amount, o.created_at,
        u.full_name as customer_name,
        STRING_AGG(p.name, ', ') as product_names,
        SUM(oi.quantity) as total_items
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       GROUP BY o.id, u.full_name
       ORDER BY o.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get recent orders error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy đơn hàng gần đây', error: error.message });
  }
};

// Get order statistics
exports.getOrderStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COALESCE(SUM(final_amount), 0) as total_revenue,
        COALESCE(AVG(final_amount), 0) as avg_order_value
      FROM orders
    `);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy thống kê đơn hàng', error: error.message });
  }
};

// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = Number(id);
    const result = await pool.query('DELETE FROM orders WHERE id = $1::int RETURNING id', [orderId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
    }
    res.json({ success: true, message: 'Xóa đơn hàng thành công' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa đơn hàng', error: error.message });
  }
};

// Approve COD payment — marks the payment record as 'paid' so admin knows money was collected
exports.approveCOD = async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = Number(id);

    const payment = await pool.query(
      `SELECT id, payment_status, payment_method
       FROM payments WHERE order_id = $1::int`,
      [orderId]
    );

    if (payment.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi thanh toán' });
    }

    const pay = payment.rows[0];
    const method = (pay.payment_method || '').toUpperCase();

    if (method !== 'COD') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ hỗ trợ duyệt thanh toán COD'
      });
    }

    if (pay.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Đơn này đã được xác nhận thanh toán trước đó'
      });
    }

    // Get order info first
    const orderResult = await pool.query(
      `SELECT user_id, status FROM orders WHERE id = $1::int`,
      [orderId]
    );
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    // Update payment
    await pool.query(
      `UPDATE payments SET payment_status = 'paid', updated_at = NOW()
       WHERE order_id = $1::int`,
      [orderId]
    );

    // Also advance order to 'confirmed' if still pending (COD approved = money confirmed)
    if (order.status === 'pending') {
      await pool.query(
        `UPDATE orders SET status = 'confirmed', updated_at = NOW() WHERE id = $1::int`,
        [orderId]
      );
    }

    if (order) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, link)
         VALUES ($1::int, $2::varchar, $3::text, $4::varchar)`,
        [order.user_id, 'Thanh toán COD đã được xác nhận',
         `Đơn hàng #${orderId} — Admin đã xác nhận thu tiền COD. Đơn hàng đang được xử lý.`,
         `/orders/${orderId}`]
      );
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, description)
         VALUES ($1::int, $2::varchar, $3::text)`,
        [req.user.id, 'APPROVE_COD', `Xác nhận thu tiền COD đơn hàng #${orderId}`]
      );
    }

    res.json({ success: true, message: 'Đã xác nhận thu tiền COD' });
  } catch (error) {
    console.error('Approve COD error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xác nhận COD' });
  }
};
