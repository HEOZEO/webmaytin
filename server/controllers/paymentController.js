const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { sendEmail } = require('../config/email');

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, '../uploads/bills');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ============================================================
// CUSTOMER APIS
// ============================================================

// GET /api/payment/qr - Get current QR payment info
exports.getQRInfo = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM payment_settings WHERE is_active = true LIMIT 1'
    );
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          bank_name: 'MBBank',
          account_number: '190067899999',
          account_holder: 'CTY TNHH LAPTOPSTORE',
          qr_image_url: null,
          instructions: 'Quý khách vui lòng chuyển khoản theo thông tin bên dưới.'
        }
      });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error getting QR info:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// POST /api/payment/upload-bill - Customer uploads bill screenshot
exports.uploadBill = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { order_id } = req.body;
    const user_id = req.user.id;
    const file = req.file;

    // Debug logging
    console.log(`[uploadBill] user_id=${user_id}, order_id=${order_id}, file=${file ? file.filename : 'NO FILE'}, size=${file?.size}, mime=${file?.mimetype}`);

    // SECURITY: reject empty or stub files (e.g. client uploads "?\n" when
    // multipart boundary is missing). Threshold 200 bytes (giảm từ 1024 để chấp nhận ảnh nhỏ)
    if (!file || !file.size || file.size < 200) {
      // Remove the bogus file we just saved
      if (file?.path) {
        try { fs.unlinkSync(file.path); } catch (_) {}
      }
      console.warn('[uploadBill] File too small or missing:', file?.size);
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Ảnh bill không hợp lệ hoặc bị rỗng. Vui lòng thử lại với ảnh khác.'
      });
    }

    // Verify file header matches declared mime type (first 12 bytes magic numbers).
    // NOTE: must be strict — accepting any image/* with magic bytes is too loose
    // (e.g. text file starting with 0xFF passes). Only accept proven PNG/JPEG/WebP/GIF.
    let validMagic = false;
    let detectedKind = 'unknown';
    try {
      const fd = fs.openSync(file.path, 'r');
      const headerBuf = Buffer.alloc(12);
      fs.readSync(fd, headerBuf, 0, 12, 0);
      fs.closeSync(fd);
      const h = headerBuf;
      if (h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4E && h[3] === 0x47) {
        detectedKind = 'png';
      } else if (h[0] === 0xFF && h[1] === 0xD8 && h[2] === 0xFF) {
        detectedKind = 'jpeg';
      } else if (h.toString('ascii', 0, 4) === 'RIFF' &&
                 h.toString('ascii', 8, 12) === 'WEBP') {
        detectedKind = 'webp';
      } else if (h.toString('ascii', 0, 3) === 'GIF') {
        detectedKind = 'gif';
      }
      // Mime phải khớp với magic byte detect được
      if (detectedKind === 'png' && (file.mimetype === 'image/png')) validMagic = true;
      else if (detectedKind === 'jpeg' && (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg')) validMagic = true;
      else if (detectedKind === 'webp' && (file.mimetype === 'image/webp')) validMagic = true;
      else if (detectedKind === 'gif' && (file.mimetype === 'image/gif')) validMagic = true;
    } catch (e) {
      console.warn('[uploadBill] Cannot read file header:', e.message);
    }

    if (!validMagic) {
      try { fs.unlinkSync(file.path); } catch (_) {}
      console.warn('[uploadBill] Invalid file magic bytes, mime:', file.mimetype, 'detected:', detectedKind);
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `File không phải ảnh hợp lệ (phát hiện: ${detectedKind}). Vui lòng upload ảnh PNG, JPG, WEBP hoặc GIF thật.`
      });
    }

    // Verify order belongs to user and is pending
    const orderCheck = await client.query(
      'SELECT id, total_amount, final_amount, status, payment_method FROM orders WHERE id = $1 AND user_id = $2',
      [order_id, user_id]
    );

    if (orderCheck.rows.length === 0) {
      console.warn('[uploadBill] Order not found:', order_id, 'for user:', user_id);
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng hoặc đơn không thuộc về bạn.' });
    }

    const order = orderCheck.rows[0];
    console.log(`[uploadBill] Order found: id=${order.id}, status=${order.status}, payment_method=${order.payment_method}`);

    // Check if order is eligible for bill upload (must be BANK_TRANSFER and not cancelled)
    if (order.payment_method !== 'BANK_TRANSFER') {
      console.warn('[uploadBill] Order is not BANK_TRANSFER:', order.payment_method);
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Đơn hàng này không phải thanh toán qua chuyển khoản.' });
    }

    if (order.status === 'cancelled') {
      console.warn('[uploadBill] Order is cancelled:', order_id);
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Đơn hàng đã bị hủy, không thể gửi bill.' });
    }

    const bill_image_url = `/uploads/bills/${file.filename}`;

    // SECURITY/FIX: Use FINAL amount (total - discount + shipping), not total_amount.
    // Otherwise admin would approve a bill that doesn't match what the customer actually owes.
    const billAmount = Number(order.final_amount);
    console.log(`[uploadBill] billAmount=${billAmount}`);

    // Upsert: update if exists, otherwise insert
    const existing = await client.query(
      'SELECT id, status, bill_image_url FROM payment_requests WHERE order_id = $1',
      [order_id]
    );

    let result;
    console.log(`[uploadBill] existing payment_request: ${existing.rows.length > 0 ? 'YES (id=' + existing.rows[0].id + ', status=' + existing.rows[0].status + ')' : 'NO'}`);

    if (existing.rows.length > 0) {
      // Only allow resend if rejected or pending (not if already approved)
      const currentStatus = existing.rows[0].status;
      if (currentStatus === 'approved') {
        console.warn('[uploadBill] Payment request already approved, cannot update');
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Đơn hàng này đã được duyệt thanh toán.' });
      }
      // Delete old bill file
      if (existing.rows[0].bill_image_url) {
        const oldPath = path.join(__dirname, '..', existing.rows[0].bill_image_url);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { console.warn('[uploadBill] Could not delete old file:', e.message); }
        }
      }
      result = await client.query(
        `UPDATE payment_requests
         SET bill_image_url = $1, status = 'pending', admin_note = NULL,
             reviewed_by = NULL, reviewed_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE order_id = $2 RETURNING *`,
        [bill_image_url, order_id]
      );
    } else {
      console.log(`[uploadBill] Creating new payment_request for order ${order_id}`);
      result = await client.query(
        `INSERT INTO payment_requests
         (order_id, user_id, amount, bill_image_url, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [order_id, user_id, billAmount, bill_image_url]
      );
    }

    // Notify admin via notification
    const admins = await client.query(
      "SELECT id FROM users WHERE role IN ('admin', 'staff') LIMIT 5"
    );

    for (const admin of admins.rows) {
      await client.query(
        'INSERT INTO notifications (user_id, title, message, link) VALUES ($1, $2, $3, $4)',
        [
          admin.id,
          'Bill thanh toán mới',
          `Khách hàng đã gửi bill thanh toán cho đơn hàng #${order_id}. Vui lòng kiểm tra và duyệt.`,
          '/admin/payments'
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Đã gửi bill thành công. Vui lòng chờ admin xác nhận.',
      data: result.rows[0]
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('[uploadBill] ERROR:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Lỗi server khi gửi bill. Vui lòng thử lại.' });
  } finally {
    client.release();
  }
};

// GET /api/payment/my-requests - Customer's own payment requests
exports.getMyRequests = async (req, res) => {
  try {
    const user_id = req.user.id;
    const result = await pool.query(
      `SELECT pr.*, o.id as order_id, o.total_amount, o.status as order_status
       FROM payment_requests pr
       JOIN orders o ON pr.order_id = o.id
       WHERE pr.user_id = $1
       ORDER BY pr.created_at DESC`,
      [user_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getting my requests:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// POST /api/payment/resend-bill - Customer resends bill for rejected request
exports.resendBill = async (req, res) => {
  // This is just an alias for uploadBill since it handles resend logic
  return exports.uploadBill(req, res);
};

// ============================================================
// ADMIN APIS
// ============================================================

// GET /api/admin/payment-settings - Get current QR settings
exports.getPaymentSettings = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM payment_settings WHERE is_active = true LIMIT 1'
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    console.error('Error getting payment settings:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// PUT /api/admin/payment-settings - Update QR settings (with optional image upload)
exports.updatePaymentSettings = async (req, res) => {
  try {
    const { bank_name, account_number, account_holder, account_content, instructions } = req.body;
    const file = req.file;

    // Validate required fields
    if (!bank_name || !account_number || !account_holder) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin ngân hàng.'
      });
    }

    // Get existing
    const existing = await pool.query(
      'SELECT * FROM payment_settings WHERE is_active = true LIMIT 1'
    );

    let qr_image_url = existing.rows[0]?.qr_image_url || null;
    if (file) {
      // SECURITY: reject empty or non-image files (same checks as customer bill upload)
      if (!file.size || file.size < 1024) {
        try { fs.unlinkSync(file.path); } catch (_) {}
        return res.status(400).json({
          success: false,
          message: 'Ảnh QR không hợp lệ hoặc bị rỗng.'
        });
      }
      const fd = fs.openSync(file.path, 'r');
      const headerBuf = Buffer.alloc(8);
      fs.readSync(fd, headerBuf, 0, 8, 0);
      fs.closeSync(fd);
      const header = headerBuf.slice(0, 4);
      let validMagic = false;
      if (file.mimetype === 'image/png' &&
          header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
        validMagic = true;
      } else if ((file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') &&
                 header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
        validMagic = true;
      } else if (file.mimetype === 'image/webp' &&
                 header.toString('ascii', 0, 4) === 'RIFF') {
        validMagic = true;
      }
      if (!validMagic) {
        try { fs.unlinkSync(file.path); } catch (_) {}
        return res.status(400).json({
          success: false,
          message: 'File upload không đúng định dạng ảnh (PNG/JPG/WEBP).'
        });
      }

      // Delete old image if exists
      if (existing.rows[0]?.qr_image_url) {
        const oldPath = path.join(__dirname, '..', existing.rows[0].qr_image_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      qr_image_url = `/uploads/bills/${file.filename}`;
    }

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE payment_settings
         SET bank_name = $1, account_number = $2, account_holder = $3,
             account_content = $4, qr_image_url = $5, instructions = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE is_active = true RETURNING *`,
        [bank_name, account_number, account_holder, account_content || null, qr_image_url, instructions || null]
      );
    } else {
      result = await pool.query(
        `INSERT INTO payment_settings
         (bank_name, account_number, account_holder, account_content, qr_image_url, instructions, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
        [bank_name, account_number, account_holder, account_content || null, qr_image_url, instructions || null]
      );
    }

    res.json({ success: true, message: 'Đã cập nhật cài đặt thanh toán.', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating payment settings:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// GET /api/admin/payment-requests - List all payment requests
exports.getPaymentRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, orderStatus, search } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let paramIdx = 1;

    let where = 'WHERE 1=1';
    if (status) {
      where += ` AND pr.status = $${paramIdx++}`;
      params.push(status);
    }
    if (orderStatus) {
      where += ` AND o.status = $${paramIdx++}`;
      params.push(orderStatus);
    }
    if (search) {
      where += ` AND (CAST(pr.order_id AS TEXT) ILIKE $${paramIdx++} OR u.full_name ILIKE $${paramIdx++} OR u.email ILIKE $${paramIdx++})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const limitIdx = paramIdx++;
    const offsetIdx = paramIdx++;

    const result = await pool.query(
      `SELECT DISTINCT ON (pr.id) pr.id,
              pr.order_id, pr.user_id, pr.amount, pr.bill_image_url,
              pr.status, pr.admin_note, pr.reviewed_by, pr.reviewed_at,
              pr.created_at, pr.updated_at,
              u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
              o.total_amount as order_total, o.status as order_status,
              r.full_name as reviewer_name
       FROM payment_requests pr
       JOIN users u ON pr.user_id = u.id
       JOIN orders o ON pr.order_id = o.id
       LEFT JOIN users r ON pr.reviewed_by = r.id
       ${where}
       ORDER BY pr.id DESC, pr.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT pr.id) FROM payment_requests pr
       JOIN users u ON pr.user_id = u.id
       JOIN orders o ON pr.order_id = o.id
       ${where}`,
      params
    );

    const total = parseInt(countResult.rows[0].count);
    const pendingWhere = "WHERE status = 'pending'";
    const pendingCount = await pool.query(
      `SELECT COUNT(*) FROM payment_requests ${pendingWhere}`
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      pendingCount: parseInt(pendingCount.rows[0].count)
    });
  } catch (error) {
    console.error('Error getting payment requests:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// GET /api/admin/payment-requests/:id - Get detail of one request
exports.getPaymentRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT pr.*,
              u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
              o.total_amount as order_total, o.status as order_status, o.created_at as order_date,
              r.full_name as reviewer_name
       FROM payment_requests pr
       JOIN users u ON pr.user_id = u.id
       JOIN orders o ON pr.order_id = o.id
       LEFT JOIN users r ON pr.reviewed_by = r.id
       WHERE pr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu thanh toán.' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error getting payment request:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// PUT /api/admin/payment-requests/:id/approve - Approve payment
exports.approvePaymentRequest = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const admin_id = req.user.id;

    // Lock the payment_request row to prevent race condition
    const req_data = await client.query(
      'SELECT * FROM payment_requests WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (req_data.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu.' });
    }

    const pr = req_data.rows[0];

    // Already approved - prevent duplicate processing
    if (pr.status === 'approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Yêu cầu này đã được duyệt trước đó.' });
    }

    // Update payment request status to approved
    await client.query(
      `UPDATE payment_requests
       SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [admin_id, id]
    );

    // Get current order status with row lock
    const orderRow = await client.query(
      'SELECT status FROM orders WHERE id = $1 FOR UPDATE',
      [pr.order_id]
    );
    const currentOrderStatus = orderRow.rows[0]?.status;

    // CRITICAL FIX: Only set order to 'confirmed' when it's still 'pending'
    // If order is already packing/shipping/delivered/cancelled, keep the current status
    let newOrderStatus = null;
    if (currentOrderStatus === 'pending') {
      newOrderStatus = 'confirmed';
      await client.query(
        `UPDATE orders SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [pr.order_id]
      );
      console.log(`Order #${pr.order_id} status updated from pending to confirmed after payment approval`);
    } else {
      // Just update the timestamp to reflect the payment approval
      await client.query(
        `UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [pr.order_id]
      );
    }

    // Update payment record to paid
    await client.query(
      `UPDATE payments SET payment_status = 'paid', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
      [pr.order_id]
    );

    // CRITICAL: Also notify ALL admins/staff about this approval
    const admins = await client.query(
      "SELECT id FROM users WHERE role IN ('admin', 'staff') LIMIT 5"
    );
    for (const admin of admins.rows) {
      await client.query(
        'INSERT INTO notifications (user_id, title, message, link) VALUES ($1, $2, $3, $4)',
        [
          admin.id,
          'Bill thanh toán đã được duyệt',
          `Đơn hàng #${pr.order_id} đã được duyệt thanh toán qua chuyển khoản.${newOrderStatus === 'confirmed' ? ' Trạng thái: Đã xác nhận.' : ''}`,
          '/admin/orders'
        ]
      );
    }

    // Notification for customer
    await client.query(
      'INSERT INTO notifications (user_id, title, message, link) VALUES ($1, $2, $3, $4)',
      [
        pr.user_id,
        'Thanh toán đã được xác nhận',
        `Bill thanh toán cho đơn hàng #${pr.order_id} đã được xác nhận thành công.${newOrderStatus === 'confirmed' ? ' Đơn hàng của bạn đang được xử lý.' : ' Đơn hàng đang được giao.'}`,
        `/profile`
      ]
    );

    // Email confirmation
    const userData = await client.query('SELECT email, full_name FROM users WHERE id = $1', [pr.user_id]);
    if (userData.rows.length > 0) {
      await sendEmail({
        to: userData.rows[0].email,
        subject: `Xác nhận thanh toán đơn hàng #${pr.order_id}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Xác nhận thanh toán thành công!</h2>
            <p>Xin chào <strong>${userData.rows[0].full_name}</strong>,</p>
            <p>Chúng tôi đã xác nhận thanh toán cho đơn hàng <strong>#${pr.order_id}</strong>.</p>
            ${newOrderStatus === 'confirmed' ? '<p>Đơn hàng của bạn đang được xử lý và sẽ sớm được giao đến bạn.</p>' : '<p>Đơn hàng của bạn đang được chuẩn bị giao.</p>'}
            <p>Cảm ơn bạn đã mua sắm tại <strong>LaptopStore</strong>!</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">LaptopStore - Hệ thống máy tính uy tín</p>
          </div>
        `
      });
    }

    // Activity log for admin
    await client.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [admin_id, 'PAYMENT_APPROVE', `Duyệt thanh toán đơn hàng #${pr.order_id}${newOrderStatus === 'confirmed' ? ' - Đơn chuyển sang Đã xác nhận' : ''}`]
    );

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: newOrderStatus === 'confirmed' 
        ? 'Đã duyệt thanh toán và xác nhận đơn hàng thành công.' 
        : 'Đã duyệt thanh toán thành công.',
      data: { orderStatus: newOrderStatus || currentOrderStatus }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving payment request:', error);
    res.status(500).json({ success: false, message: 'Lỗi duyệt thanh toán' });
  } finally {
    client.release();
  }
};

// PUT /api/admin/payment-requests/:id/reject - Reject payment
exports.rejectPaymentRequest = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { reason } = req.body;
    const admin_id = req.user.id;

    // Lock the payment_request row to prevent race condition
    const req_data = await client.query(
      'SELECT * FROM payment_requests WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (req_data.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu.' });
    }

    const pr = req_data.rows[0];

    // Already approved - cannot reject
    if (pr.status === 'approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Không thể từ chối yêu cầu đã được duyệt.' });
    }

    // Update payment request
    await client.query(
      `UPDATE payment_requests
       SET status = 'rejected', admin_note = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [reason || 'Không có ghi chú', admin_id, id]
    );

    // Update order notification: keep order in pending state (customer needs to re-upload bill)
    // Do NOT change order status - it should stay pending until a valid bill is approved
    await client.query(
      `UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [pr.order_id]
    );

    // CRITICAL: Also update the payments table status to reflect rejection
    await client.query(
      `UPDATE payments SET payment_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
      [pr.order_id]
    );

    // Notification for customer
    await client.query(
      'INSERT INTO notifications (user_id, title, message, link) VALUES ($1, $2, $3, $4)',
      [
        pr.user_id,
        'Thanh toán bị từ chối',
        `Bill thanh toán cho đơn hàng #${pr.order_id} không được chấp nhận. Vui lòng kiểm tra lại và gửi bill mới.${reason ? ` Lý do: ${reason}` : ''}`,
        `/payment?orderId=${pr.order_id}`
      ]
    );

    // Email rejection notification
    const userData = await client.query('SELECT email, full_name FROM users WHERE id = $1', [pr.user_id]);
    if (userData.rows.length > 0) {
      const reasonText = reason
        ? `<p><strong>Lý do:</strong> ${reason}</p>`
        : '<p>Không có ghi chú từ admin.</p>';

      await sendEmail({
        to: userData.rows[0].email,
        subject: `Thanh toán đơn hàng #${pr.order_id} bị từ chối - Vui lòng gửi lại bill`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Thanh toán bị từ chối</h2>
            <p>Xin chào <strong>${userData.rows[0].full_name}</strong>,</p>
            <p>Rất tiếc, bill thanh toán bạn gửi cho đơn hàng <strong>#${pr.order_id}</strong> không được chấp nhận.</p>
            ${reasonText}
            <p><strong>Hướng dẫn:</strong> Vui lòng đăng nhập vào tài khoản của bạn, vào mục "Thanh Toán" và tải lên bill mới để chúng tôi xác minh.</p>
            <p style="color: #f59e0b; font-weight: bold;">Lưu ý: Nếu bạn đã chuyển khoản đúng số tiền, vui lòng gửi lại ảnh chụp màn hình biên lai rõ ràng có thông tin chuyển khoản.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">LaptopStore - Hệ thống máy tính uy tín</p>
          </div>
        `
      });
    }

    // Activity log
    await client.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [admin_id, 'PAYMENT_REJECT', `Từ chối thanh toán đơn hàng #${pr.order_id}${reason ? ` - Lý do: ${reason}` : ''}`]
    );

    await client.query('COMMIT');

    res.json({ success: true, message: 'Đã từ chối thanh toán. Email thông báo đã được gửi đến khách hàng.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rejecting payment request:', error);
    res.status(500).json({ success: false, message: 'Lỗi từ chối thanh toán' });
  } finally {
    client.release();
  }
};
