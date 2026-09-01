const { pool } = require('../config/database');
const { sendEmail } = require('../config/email');
const { orderConfirmation } = require('../templates/emailTemplates');
const { sanitizeInput, sanitizeOrderNotes } = require('../utils/sanitizer');
const crypto = require('crypto');

// Generate formatted order ID: LS-YYYYMMDD-XXXXX
const generateOrderCode = (id) => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const paddedId = String(id).padStart(5, '0');
  return `LS-${dateStr}-${paddedId}`;
};

/**
 * Create an order with full transactional safety:
 *  - Lock product rows FOR UPDATE
 *  - Validate items first (cheap validation before any DB write)
 *  - Atomic stock decrement with check (UPDATE ... WHERE stock >= qty RETURNING ...)
 *  - Atomic coupon usage: increment with max_uses check, rollback on overflow
 *  - Insert order, items, payment, coupon_usage inside one transaction
 *  - Log activity + email best-effort AFTER commit
 */
exports.createOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { items, shipping_address, phone, payment_method, coupon_code, notes, shipping_method_id, district_id, ward_id, recipient_name, email } = req.body;
    const user_id = req.user.id;
    const sanitizedPhone = sanitizeInput(phone || '').trim();
    const sanitizedRecipientName = recipient_name ? sanitizeInput(recipient_name).trim() : null;
    const sanitizedEmail = email ? sanitizeInput(email).trim() : null;

    // ----- 1. Cheap validation FIRST (before any DB hit) -----
    if (!Array.isArray(items) || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Giỏ hàng đang trống' });
    }
    if (!payment_method || !['cod', 'COD', 'bank_transfer', 'BANK_TRANSFER'].includes(payment_method)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Phương thức thanh toán không hợp lệ' });
    }
    if (!shipping_address || shipping_address.length < 10) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Địa chỉ giao hàng không hợp lệ' });
    }
    if (!sanitizedPhone || !/^[0-9]{10,11}$/.test(sanitizedPhone)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ' });
    }

    // Normalize & validate items
    const normalizedItems = [];
    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(productId) || productId <= 0 ||
          !Number.isInteger(quantity) || quantity <= 0 || quantity > 999) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Thông tin sản phẩm không hợp lệ' });
      }
      normalizedItems.push({ product_id: productId, quantity });
    }

    // Sanitize text - use specialized sanitizers
    const sanitizedAddress = sanitizeInput(shipping_address);
    const sanitizedNotes = notes ? sanitizeOrderNotes(notes) : null;

    // ----- 2. Shipping fee -----
    let shippingFee = 0;
    if (district_id) {
      const districtCheck = await client.query(
        'SELECT id, shipping_fee FROM districts WHERE id = $1',
        [Number(district_id)]
      );
      if (districtCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Quận/Huyện giao hàng không hợp lệ' });
      }
      shippingFee = Number(districtCheck.rows[0].shipping_fee || 0);
    } else if (shipping_method_id) {
      const smCheck = await client.query(
        'SELECT cost FROM shipping_methods WHERE id = $1 AND is_active = TRUE',
        [Number(shipping_method_id)]
      );
      if (smCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Phương thức vận chuyển không hợp lệ' });
      }
      shippingFee = Number(smCheck.rows[0].cost || 0);
    }

    // ----- 3. Lock product rows & validate stock -----
    // Sort productIds ascending to reduce deadlock probability when concurrent orders hit overlapping sets.
    const sortedIds = [...new Set(normalizedItems.map(i => i.product_id))].sort((a, b) => a - b);
    const lockResult = await client.query(
      `SELECT id, name, price, stock, is_active, deleted_at
       FROM products
       WHERE id = ANY($1::int[])
       ORDER BY id
       FOR UPDATE`,
      [sortedIds]
    );

    const productsMap = new Map(lockResult.rows.map(p => [p.id, p]));

    let total_amount = 0;
    const orderItems = [];

    for (const item of normalizedItems) {
      const product = productsMap.get(item.product_id);
      if (!product) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Sản phẩm #${item.product_id} không tồn tại` });
      }
      if (product.deleted_at || !product.is_active) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Sản phẩm "${product.name}" hiện không khả dụng` });
      }
      if (Number(product.stock) < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${product.name}" không đủ hàng trong kho (còn ${product.stock})`
        });
      }

      // SERVER-SIDE PRICE — never trust client
      const serverPrice = Number(product.price);
      total_amount += serverPrice * item.quantity;
      orderItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: serverPrice,
        name: product.name
      });
    }

    // ----- 4. Coupon (atomic with row lock to prevent race condition) -----
    let discount_amount = 0;
    let coupon_id = null;
    if (coupon_code) {
      // Step 1: Lock the coupon row with SELECT FOR UPDATE to prevent race condition
      // This ensures only one transaction can modify the coupon at a time
      const couponLock = await client.query(
        `SELECT id, code, discount_percent, max_discount, min_order_amount,
                max_uses, used_count, is_active, valid_from, valid_to, usage_per_user
         FROM coupons
         WHERE UPPER(code) = UPPER($1)
         FOR UPDATE`,
        [coupon_code]
      );

      if (couponLock.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Mã giảm giá không tồn tại'
        });
      }

      const coupon = couponLock.rows[0];

      // Step 2: Validate coupon state (all checks must pass)
      if (!coupon.is_active) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Mã giảm giá đã bị vô hiệu hóa'
        });
      }

      if (new Date(coupon.valid_from) > new Date() || new Date(coupon.valid_to) < new Date()) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Mã giảm giá đã hết hạn'
        });
      }

      if (coupon.used_count >= coupon.max_uses) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Mã giảm giá đã hết lượt sử dụng'
        });
      }

      // Step 2.5: Kiểm tra giới hạn sử dụng per user (usage_per_user)
      if (coupon.usage_per_user !== null && coupon.usage_per_user !== undefined) {
        const userUsageCheck = await client.query(
          `SELECT COUNT(*) as user_usage_count
           FROM coupon_usage
           WHERE coupon_id = $1 AND user_id = $2`,
          [coupon.id, user_id]
        );
        const userUsageCount = parseInt(userUsageCheck.rows[0].user_usage_count);
        if (userUsageCount >= coupon.usage_per_user) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Bạn đã sử dụng mã này ${userUsageCount} lần. Mỗi tài khoản chỉ được sử dụng tối đa ${coupon.usage_per_user} lần.`
          });
        }
      }

      const minOrder = Number(coupon.min_order_amount || 0);
      if (total_amount < minOrder) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Mã này yêu cầu đơn tối thiểu ${new Intl.NumberFormat('vi-VN').format(minOrder)}đ`
        });
      }

      // Step 3: Increment used_count while holding the lock
      await client.query(
        `UPDATE coupons SET used_count = used_count + 1 WHERE id = $1`,
        [coupon.id]
      );

      // Step 4: Calculate discount
      discount_amount = (total_amount * Number(coupon.discount_percent)) / 100;
      const maxDiscount = coupon.max_discount != null ? Number(coupon.max_discount) : null;
      if (maxDiscount != null && discount_amount > maxDiscount) {
        discount_amount = maxDiscount;
      }
      coupon_id = coupon.id;
    }

    const final_amount = total_amount - discount_amount + shippingFee;

    // ----- 5. Create order -----
    const orderResult = await client.query(
      `INSERT INTO orders
        (user_id, total_amount, discount_amount, final_amount, shipping_address,
         phone, payment_method, coupon_id, notes, status, shipping_method_id, district_id, ward_id, shipping_fee,
         recipient_name, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [user_id, total_amount, discount_amount, final_amount, sanitizedAddress,
       sanitizedPhone, payment_method.toUpperCase(), coupon_id, sanitizedNotes,
       shipping_method_id || null, district_id || null, ward_id ? Number(ward_id) : null, shippingFee,
       sanitizedRecipientName, sanitizedEmail]
    );

    const order = orderResult.rows[0];

    // ----- 6. Insert order items + atomic stock decrement + inventory log -----
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.quantity, item.price]
      );

      const updateResult = await client.query(
        `UPDATE products
         SET stock = stock - $1, sold = sold + $1, updated_at = NOW()
         WHERE id = $2 AND stock >= $1
         RETURNING name, stock`,
        [item.quantity, item.product_id]
      );

      if (updateResult.rows.length === 0) {
        // Should never happen because we FOR-UPDATE-locked earlier; defensive only.
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: `Sản phẩm "${item.name}" vừa hết hàng, vui lòng thử lại`
        });
      }

      // Best-effort inventory log (table may not exist in some envs).
      // Use SAVEPOINT so a missing column / table doesn't abort the parent TX.
      await client.query('SAVEPOINT sp_inv_log');
      try {
        await client.query(
          `INSERT INTO inventory_transactions (product_id, quantity_change, reason, created_at)
           VALUES ($1, $2, 'order_created', NOW())`,
          [item.product_id, -item.quantity]
        );
        await client.query('RELEASE SAVEPOINT sp_inv_log');
      } catch (e) {
        await client.query('ROLLBACK TO SAVEPOINT sp_inv_log');
        if (e.code !== '42P01' && e.code !== '42703') throw e;
        // 42P01 = table not exist, 42703 = column not exist — both safe to ignore
      }
    }

    // ----- 7. Payment record (pending) -----
    await client.query('SAVEPOINT sp_payment');
    try {
      await client.query(
        `INSERT INTO payments (order_id, payment_method, payment_status, amount)
         VALUES ($1, $2, 'pending', $3)`,
        [order.id, payment_method.toUpperCase(), final_amount]
      );
      await client.query('RELEASE SAVEPOINT sp_payment');
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT sp_payment');
      console.warn('Payment record failed (table may not exist):', e.message);
    }

    // ----- 7.5. Auto-create payment_request for BANK_TRANSFER orders -----
    // This creates a pending payment_request so admin can track and approve it
    if (payment_method.toUpperCase() === 'BANK_TRANSFER') {
      await client.query('SAVEPOINT sp_payment_request');
      try {
        // Generate transfer content: order ID for reference
        const transferContent = `LS${order.id}`;
        await client.query(
          `INSERT INTO payment_requests (order_id, user_id, amount, status, transfer_content)
           VALUES ($1, $2, $3, 'pending', $4)`,
          [order.id, user_id, final_amount, transferContent]
        );
        await client.query('RELEASE SAVEPOINT sp_payment_request');
        console.log(`Auto-created payment_request for BANK_TRANSFER order #${order.id}`);
      } catch (e) {
        await client.query('ROLLBACK TO SAVEPOINT sp_payment_request');
        console.warn('Payment request auto-creation failed (table may not exist):', e.message);
      }
    }

    // ----- 8. Coupon usage -----
    // Wrapped in SAVEPOINT because an optional-side failure (e.g. column
    // mismatch, schema drift) must NOT abort the parent transaction — otherwise
    // every later statement gets `25P02 current transaction is aborted` and the
    // order itself is rolled back along with the cart delete.
    if (coupon_id) {
      await client.query('SAVEPOINT sp_coupon_usage');
      try {
        // Constraint hiện có: UNIQUE (coupon_id, user_id, order_id)
        // Dùng đúng 3 cột để ON CONFLICT hoạt động (fix: trước đây chỉ dùng 2 cột gây lỗi 42P10 → INSERT luôn fail → DB rỗng → user dùng mã thoải mái)
        await client.query(
          `INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (coupon_id, user_id, order_id) DO NOTHING`,
          [coupon_id, user_id, order.id, discount_amount]
        );
        await client.query('RELEASE SAVEPOINT sp_coupon_usage');
      } catch (e) {
        await client.query('ROLLBACK TO SAVEPOINT sp_coupon_usage');
        // Bug trước: chỉ log warning, đơn vẫn commit. Bây giờ raise để rollback cả order
        // vì nếu không có row này thì user sẽ dùng mã thoải mái vượt usage_per_user.
        throw new Error(`Coupon usage tracking failed: ${e.message}`);
      }
    }

    // ----- 9. Clear cart (REQUIRED STEP - not in SAVEPOINT) -----
    // Cart must be cleared to prevent duplicate orders when client retries
    try {
      const cartDeleteResult = await client.query(
        'DELETE FROM cart WHERE user_id = $1',
        [user_id]
      );

      // If no rows deleted but cart existed, log warning but don't fail
      // (cart might have been cleared by another request)
      if (cartDeleteResult.rowCount === 0) {
        console.warn(`Cart for user ${user_id} was already empty or cleared`);
      } else {
        console.log(`Cleared ${cartDeleteResult.rowCount} items from cart for user ${user_id}`);
      }
    } catch (cartError) {
      // CRITICAL: Cart clear failure could cause duplicate orders
      // Rollback entire transaction to prevent order from being placed
      await client.query('ROLLBACK');
      console.error('CRITICAL: Failed to clear cart - order blocked to prevent duplicates:', cartError);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi xử lý giỏ hàng. Vui lòng thử lại.',
        code: 'CART_CLEAR_FAILED'
      });
    }

    // ----- 10. Notification + activity log -----
    await client.query('SAVEPOINT sp_notif');
    try {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, link)
         VALUES ($1, $2, $3, $4)`,
        [user_id, 'Đơn hàng đã được tạo',
         `Đơn hàng #${order.id} đã được tạo. Tổng tiền: ${new Intl.NumberFormat('vi-VN').format(final_amount)}đ`,
         `/orders/${order.id}`]
      );
      await client.query('RELEASE SAVEPOINT sp_notif');
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT sp_notif');
      console.warn('Notification failed (table may not exist):', e.message);
    }

    await client.query('SAVEPOINT sp_activity');
    try {
      await client.query(
        `INSERT INTO activity_logs (user_id, action, description)
         VALUES ($1, $2, $3)`,
        [user_id, 'ORDER_CREATE', `Tạo đơn hàng #${order.id}`]
      );
      await client.query('RELEASE SAVEPOINT sp_activity');
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT sp_activity');
      console.warn('Activity log failed (table may not exist):', e.message);
    }

    await client.query('COMMIT');

    // ----- 11. Best-effort: send confirmation email AFTER commit -----
    try {
      const user = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [user_id]);
      if (user && user.rows && user.rows.length > 0) {
        const emailHtml = orderConfirmation(
          {
            id: order.id,
            total_amount,
            discount_amount,
            final_amount: order.final_amount,
            shipping_address: sanitizedAddress,
            payment_method
          },
          orderItems,
          user.rows[0]
        );
        await sendEmail({
          to: user.rows[0].email,
          subject: `[Laptop Store] Xác nhận đơn hàng #${order.id}`,
          html: emailHtml
        });
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(201).json({
      success: true,
      data: {
        id: order.id,
        order_code: `LS-${order.id}`,
        total_amount,
        discount_amount,
        shipping_fee: shippingFee,
        final_amount: order.final_amount,
        payment_method: payment_method.toUpperCase(),
        coupon_code: coupon_code || null,
        shipping_address: sanitizedAddress,
        phone: sanitizedPhone
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo đơn hàng' });
  } finally {
    client.release();
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const user_id = req.user.id;
    const role = req.user.role;

    // SECURITY: Build safe query that only exposes necessary fields to customers
    let query = `
      SELECT o.id, o.order_code, o.status, o.total_amount, o.discount_amount,
             o.final_amount, o.shipping_fee, o.shipping_address, o.phone,
             o.payment_method, o.created_at, o.updated_at,
             o.notes, o.cancel_reason,
             COUNT(oi.id) as item_count,
             (
               SELECT json_agg(row_to_json(t))
               FROM (
                 SELECT oi2.id, oi2.product_id, p2.name as product_name,
                        p2.image_url as product_image, oi2.quantity, oi2.price
                 FROM order_items oi2
                 JOIN products p2 ON oi2.product_id = p2.id
                 WHERE oi2.order_id = o.id
                 ORDER BY oi2.id ASC
               ) t
             ) as items,
             (
               SELECT json_build_object(
                 'status', pm.payment_status,
                 'method', pm.payment_method,
                 'paid_at', pm.paid_at
               )
               FROM payments pm
               WHERE pm.order_id = o.id
               ORDER BY pm.id DESC
               LIMIT 1
             ) as payment_info,
             -- Bill info cho customer (cần để hiển thị trạng thái + ảnh bill trong danh sách)
             (
               SELECT json_build_object(
                 'status', pr.status,
                 'admin_note', pr.admin_note,
                 'bill_image_url', pr.bill_image_url,
                 'reviewed_at', pr.reviewed_at,
                 'created_at', pr.created_at,
                 'amount', pr.amount
               )
               FROM payment_requests pr
               WHERE pr.order_id = o.id
               ORDER BY pr.id DESC
               LIMIT 1
             ) as bill_info
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE (o.deleted_at IS NULL)
    `;

    const params = [];
    let paramIndex = 1;

    if (role === 'customer') {
      query += ` AND o.user_id = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC';

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit, 10), offset);

    const result = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(DISTINCT o.id) as total FROM orders o WHERE (o.deleted_at IS NULL)';
    const countParams = [];
    let countParamIndex = 1;
    if (role === 'customer') {
      countQuery += ` AND o.user_id = $${countParamIndex++}`;
      countParams.push(user_id);
    }
    if (status) {
      countQuery += ` AND o.status = $${countParamIndex}`;
      countParams.push(status);
    }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Format order codes for display
    const formattedOrders = result.rows.map(order => ({
      ...order,
      order_code: order.order_code || generateOrderCode(order.id),
      payment_status: order.payment_info?.status || 'pending',
      payment_status_display: getPaymentStatusDisplay(order.payment_info?.status),
      payment_method: order.payment_method,
      // Flatten bill_info cho customer (cũng giữ payment_request cho compatibility)
      bill_status: order.bill_info?.status || null,
      bill_image_url: order.bill_info?.bill_image_url || null,
      bill_reviewed_at: order.bill_info?.reviewed_at || null,
      bill_admin_note: order.bill_info?.admin_note || null,
      payment_request: order.bill_info ? {
        status: order.bill_info.status,
        admin_note: order.bill_info.admin_note,
        bill_image_url: order.bill_info.bill_image_url,
        reviewed_at: order.bill_info.reviewed_at,
        created_at: order.bill_info.created_at,
        amount: order.bill_info.amount
      } : null
    }));

    res.json({
      success: true,
      data: formattedOrders,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / Math.max(1, parseInt(limit, 10)))
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đơn hàng' });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const role = req.user.role;

    let query = `
      SELECT o.*, u.email, u.full_name, u.phone as user_phone,
             d.name as district_name, d.zone as district_zone,
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'product_id', oi.product_id,
                 'product_name', p.name,
                 'product_image', p.image_url,
                 'quantity', oi.quantity,
                 'price', oi.price
               )
             ) as items,
             pm.id as payment_id,
             pm.payment_method as payment_record_method,
             pm.payment_status as payment_record_status,
             pm.amount as payment_record_amount,
             pm.paid_at as payment_record_paid_at,
             -- Bill info for admin/staff
             pr.id as payment_request_id,
             pr.status as bill_status,
             pr.admin_note,
             pr.reviewed_at as bill_reviewed_at,
             pr.bill_image_url,
             pr.created_at as bill_created_at
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN districts d ON o.district_id = d.id
      LEFT JOIN payments pm ON o.id = pm.order_id
      LEFT JOIN payment_requests pr ON o.id = pr.order_id
      WHERE o.id = $1::int AND (o.deleted_at IS NULL)
    `;

    const params = [Number(id)];
    // Lưu ý: Query chỉ tham chiếu $1. Không đưa `role` vào params vì postgres
    // không thể xác định kiểu của tham số không được sử dụng (lỗi 42P18).

    if (role === 'customer') {
      query += ' AND o.user_id = $2';
      params.push(user_id);
    }

    query += ' GROUP BY o.id, u.email, u.full_name, u.phone, d.name, d.zone, pm.id, pm.payment_method, pm.payment_status, pm.amount, pm.paid_at, pr.id, pr.status, pr.admin_note, pr.reviewed_at, pr.bill_image_url, pr.created_at';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    // SECURITY: Build safe response - remove internal fields for customers
    const order = result.rows[0];
    const isCustomer = role === 'customer';

    // Build payment_request object for frontend compatibility
    const paymentRequest = order.bill_status ? {
      id: order.payment_request_id,
      status: order.bill_status,
      admin_note: order.admin_note,
      reviewed_at: order.bill_reviewed_at,
      bill_image_url: order.bill_image_url,
      amount: order.final_amount,
      created_at: order.bill_created_at
    } : null;

    const safeOrder = {
      id: order.id,
      order_code: order.order_code || generateOrderCode(order.id),
      status: order.status,
      total_amount: order.total_amount,
      discount_amount: order.discount_amount,
      final_amount: order.final_amount,
      shipping_fee: order.shipping_fee,
      shipping_address: order.shipping_address,
      phone: order.phone,
      payment_method: order.payment_method,
      payment_status: order.payment_record_status,
      payment_status_display: getPaymentStatusDisplay(order.payment_record_status),
      items: order.items,
      notes: order.notes,
      cancel_reason: order.cancel_reason,
      created_at: order.created_at,
      updated_at: order.updated_at,
      // Bill info - LUÔN trả cho customer (cần thiết để hiển thị ảnh bill và trạng thái)
      // Lưu ý: chỉ trả bill_image_url + bill_status + admin_note, không lộ payment_id, reviewed_by, etc.
      bill_status: order.bill_status || null,
      bill_image_url: order.bill_image_url || null,
      bill_reviewed_at: order.bill_reviewed_at || null,
      admin_note: order.admin_note || null,
      payment_request: paymentRequest,
      // Only include these for staff/admin
      ...(isCustomer ? {} : {
        user_id: order.user_id,
        email: order.email,
        full_name: order.full_name,
        user_phone: order.user_phone,
        district_name: order.district_name,
        district_zone: order.district_zone,
        coupon_id: order.coupon_id,
        shipping_method_id: order.shipping_method_id,
        district_id: order.district_id,
        ward_id: order.ward_id,
        cancelled_by: order.cancelled_by,
        cancelled_at: order.cancelled_at,
        payment_id: order.payment_id
      })
    };

    res.json({
      success: true,
      data: safeOrder
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết đơn hàng' });
  }
};

// Helper: Get human-readable payment status
const getPaymentStatusDisplay = (status) => {
  const displayMap = {
    'pending': 'Chờ thanh toán',
    'paid': 'Đã thanh toán',
    'cancelled': 'Đã hủy',
    'refunded': 'Đã hoàn tiền'
  };
  return displayMap[status] || status;
};

exports.updateOrderStatus = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { status } = req.body;

    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['packing', 'cancelled'],
      packing: ['shipping', 'cancelled'],
      shipping: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: []
    };

    const orderResult = await client.query(
      `SELECT o.*, u.email, u.full_name FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const order = orderResult.rows[0];

    if (req.user.role === 'customer' && order.user_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Bạn không có quyền cập nhật đơn hàng này' });
    }

    const oldStatus = order.status;

    if (!validTransitions[oldStatus]?.includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển từ "${oldStatus}" sang "${status}"`
      });
    }

    const statusText = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      packing: 'Đang đóng gói',
      shipping: 'Đang vận chuyển',
      delivered: 'Giao thành công',
      cancelled: 'Đã hủy'
    };

    const result = await client.query(
      'UPDATE orders SET status = $1::varchar, updated_at = NOW() WHERE id = $2::int RETURNING *',
      [status, id]
    );

    if (['delivered', 'cancelled'].includes(status)) {
      const paymentStatusTarget = status === 'delivered' ? 'paid' : 'cancelled';
      await client.query(
        `UPDATE payments SET payment_status = $1, updated_at = NOW()
         WHERE order_id = $2 AND payment_status = 'pending'`,
        [paymentStatusTarget, id]
      );
    }

    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      const itemsResult = await client.query(
        `SELECT product_id, quantity FROM order_items WHERE order_id = $1`,
        [id]
      );
      for (const item of itemsResult.rows) {
        await client.query(
          `UPDATE products SET stock = stock + $1, sold = GREATEST(sold - $1, 0)
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );
      }
      await client.query(
        `UPDATE payments SET payment_status = 'cancelled'
         WHERE order_id = $1 AND payment_status != 'paid'`,
        [id]
      );
      // Restore coupon usage
      // Ưu tiên lấy coupon_id từ orders (chắc chắn có), fallback sang coupon_usage
      const couponResult2 = await client.query(
        `SELECT coupon_id FROM (
           SELECT coupon_id FROM orders WHERE id = $1::int AND coupon_id IS NOT NULL
           UNION
           SELECT coupon_id FROM coupon_usage WHERE order_id = $1::int
         ) all_coupons`,
        [id]
      );
      if (couponResult2.rows.length > 0) {
        const couponIds2 = Array.from(new Set(couponResult2.rows.map(r => r.coupon_id)));
        await client.query(
          `DELETE FROM coupon_usage WHERE order_id = $1::int`,
          [id]
        );
        await client.query(
          `UPDATE coupons SET used_count = GREATEST(used_count - 1, 0)
           WHERE id = ANY($1::int[])`,
          [couponIds2]
        );
        console.log(`[updateOrderStatus] Restored coupon usage for order #${id}: coupons ${couponIds2.join(',')}`);
      }
    }

    await client.query(
      `INSERT INTO notifications (user_id, title, message, link)
       VALUES ($1, $2, $3, $4)`,
      [order.user_id, 'Cập nhật đơn hàng',
       `Đơn hàng #${id} đã được cập nhật thành: ${statusText[status] || status}`,
       `/orders/${id}`]
    );

    await client.query(
      `INSERT INTO activity_logs (user_id, action, description)
       VALUES ($1, $2, $3)`,
      [req.user.id, 'ORDER_UPDATE_STATUS', `Cập nhật trạng thái đơn hàng #${id} thành ${status}`]
    );

    await client.query('COMMIT');

    try {
      if (order.email) {
        await sendEmail({
          to: order.email,
          subject: `Cập nhật đơn hàng #${id}`,
          html: `
            <h2>Cập nhật trạng thái đơn hàng</h2>
            <p>Xin chào ${order.full_name},</p>
            <p>Đơn hàng #${id} đã được cập nhật.</p>
            <p><strong>Trạng thái mới:</strong> ${statusText[status] || status}</p>
          `
        });
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái' });
  } finally {
    client.release();
  }
};

/**
 * Cancel order — restore stock with row locks to avoid race condition.
 * Atomic: only restores stock if the order is in pending/confirmed state and not already cancelled.
 */
exports.cancelOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const orderId = Number(id); // parse once so SQL planner has unambiguous int
    const user_id = req.user.id;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do hủy đơn' });
    }

    // Lock the order row
    const orderResult = await client.query(
      `SELECT id, user_id, status FROM orders WHERE id = $1::int FOR UPDATE`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const order = orderResult.rows[0];

    // Ownership check (customers can only cancel their own)
    if (req.user.role === 'customer' && order.user_id !== user_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Bạn không có quyền hủy đơn hàng này' });
    }

    // Only allow pending/confirmed to be cancelled
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy đơn hàng ở trạng thái "Chờ xác nhận" hoặc "Đã xác nhận"'
      });
    }

    // Atomic status update (only if not already cancelled)
    const upd = await client.query(
      `UPDATE orders SET status = 'cancelled', updated_at = NOW(),
       cancel_reason = $2, cancelled_by = $3, cancelled_at = NOW()
       WHERE id = $1::int AND status IN ('pending', 'confirmed')
       RETURNING id`,
      [orderId, reason.trim(), user_id]
    );

    if (upd.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Đơn hàng đã được hủy trước đó' });
    }

    // Lock order items + product rows together (sorted to avoid deadlock)
    const itemsResult = await client.query(
      `SELECT product_id, quantity FROM order_items WHERE order_id = $1::int ORDER BY product_id`,
      [orderId]
    );

    for (const item of itemsResult.rows) {
      // Lock product row, then restore stock
      const lock = await client.query(
        `SELECT id FROM products WHERE id = $1::int FOR UPDATE`,
        [item.product_id]
      );
      if (lock.rows.length === 0) continue;

      await client.query(
        `UPDATE products SET stock = stock + $1, sold = GREATEST(sold - $1, 0)
         WHERE id = $2::int`,
        [item.quantity, item.product_id]
      );
    }

    // Update payment status
    await client.query(
      `UPDATE payments SET payment_status = 'cancelled'
       WHERE order_id = $1::int AND payment_status != 'paid'`,
      [orderId]
    );

    // Restore coupon usage (so customer can use it again)
    // Ưu tiên lấy coupon_id từ orders (chắc chắn có), fallback sang coupon_usage
    // (trường hợp cũ: order có coupon_id nhưng coupon_usage row bị thiếu do bug INSERT)
    const couponResult = await client.query(
      `SELECT coupon_id FROM (
         SELECT coupon_id FROM orders WHERE id = $1::int AND coupon_id IS NOT NULL
         UNION
         SELECT coupon_id FROM coupon_usage WHERE order_id = $1::int
       ) all_coupons`,
      [orderId]
    );
    if (couponResult.rows.length > 0) {
      const couponIds = Array.from(new Set(couponResult.rows.map(r => r.coupon_id)));
      await client.query(
        `DELETE FROM coupon_usage WHERE order_id = $1::int`,
        [orderId]
      );
      await client.query(
        `UPDATE coupons SET used_count = GREATEST(used_count - 1, 0)
         WHERE id = ANY($1::int[])`,
        [couponIds]
      );
      console.log(`[cancelOrder] Restored coupon usage for order #${orderId}: coupons ${couponIds.join(',')}`);
    }

    // Notification for customer + admin
    await client.query(
      `INSERT INTO notifications (user_id, title, message, link)
       VALUES ($1::int, $2::varchar, $3::text, $4::varchar)`,
      [order.user_id, 'Đơn hàng đã hủy', `Đơn hàng #${orderId} đã được hủy. Lý do: ${reason.trim()}`, `/orders/${orderId}`]
    );

    // Notify admins about the cancellation
    await client.query(
      `INSERT INTO notifications (user_id, title, message, link)
       SELECT id, $1::varchar, $2::text, $3::varchar
       FROM users WHERE role IN ('admin', 'staff')
       LIMIT 5`,
      ['Đơn hàng bị hủy bởi khách', `Khách hàng đã hủy đơn hàng #${orderId}`, `/admin/orders`]
    );

    await client.query(
      `INSERT INTO activity_logs (user_id, action, description)
       VALUES ($1, $2, $3)`,
      [user_id, 'ORDER_CANCEL', `Hủy đơn hàng #${orderId}`]
    );

    await client.query('COMMIT');

    // Best-effort email after commit
    try {
      const user = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [order.user_id]);
      if (user.rows.length > 0) {
        await sendEmail({
          to: user.rows[0].email,
          subject: `Đơn hàng #${orderId} đã bị hủy`,
          html: `
            <h2>Thông báo hủy đơn hàng</h2>
            <p>Xin chào ${user.rows[0].full_name},</p>
            <p>Đơn hàng #${orderId} của bạn đã được hủy thành công.</p>
            <p><strong>Lý do hủy:</strong> ${reason.trim()}</p>
            <p>Nếu bạn có thắc mắc, vui lòng liên hệ với chúng tôi.</p>
          `
        });
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Đã hủy đơn hàng thành công'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: 'Lỗi hủy đơn hàng' });
  } finally {
    client.release();
  }
};
