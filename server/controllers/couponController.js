const { pool } = require('../config/database');

// GET /api/coupons - Admin lấy tất cả
exports.getCoupons = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM coupons ORDER BY created_at DESC'
    );
    res.json({ success: true, data: { coupons: result.rows } });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách mã giảm giá' });
  }
};

// GET /api/coupons/available - Public: lấy các coupon active + public (hiển thị cho khách hàng)
exports.getAvailableCoupons = async (req, res) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (e) { /* continue without user */ }
    }

    let query = `
      SELECT
        c.id, c.code, c.description, c.discount_percent,
        c.max_discount, c.min_order_amount,
        c.max_uses,
        -- Nguồn chính xác cho số lượt đã dùng = COUNT từ coupon_usage
        -- (cột used_count bị lệch trước fix vì INSERT vào coupon_usage thất bại)
        COALESCE(actual_usage.cnt, 0)::int AS used_count,
        c.valid_from, c.valid_to,
        c.usage_per_user,
        -- Số lượt còn lại tính từ nguồn chính xác
        (c.max_uses - COALESCE(actual_usage.cnt, 0)) AS remaining_uses,
        -- Số user tối đa có thể dùng mã này (theo max_uses / usage_per_user)
        CASE
          WHEN c.usage_per_user IS NULL OR c.usage_per_user = 0 THEN NULL
          ELSE FLOOR(c.max_uses::numeric / c.usage_per_user)::int
        END AS max_reachable_users,
        -- Cảnh báo: max_uses KHÔNG chia hết cho usage_per_user
        CASE
          WHEN c.usage_per_user IS NULL OR c.usage_per_user = 0 THEN false
          WHEN (c.max_uses % c.usage_per_user) = 0 THEN false
          ELSE true
        END AS has_unused_slots
    `;

    if (userId) {
      query += `,
        COALESCE(
          (SELECT COUNT(*)::int FROM coupon_usage WHERE user_id = $1 AND coupon_id = c.id),
          0
        ) AS user_used_count,
        -- Số lần user còn có thể dùng
        CASE
          WHEN c.usage_per_user IS NULL THEN NULL
          ELSE GREATEST(c.usage_per_user - COALESCE(
            (SELECT COUNT(*)::int FROM coupon_usage WHERE user_id = $1 AND coupon_id = c.id), 0
          ), 0)
        END AS user_remaining_uses
      `;
    }

    query += `
      FROM coupons c
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt FROM coupon_usage WHERE coupon_id = c.id
      ) actual_usage ON true
      WHERE c.is_active = true
        AND c.is_public = true
        AND (c.valid_from IS NULL OR c.valid_from <= NOW())
        AND (c.valid_to IS NULL OR c.valid_to >= NOW())
        AND (c.max_uses IS NULL OR COALESCE(actual_usage.cnt, 0) < c.max_uses)
      ORDER BY c.discount_percent DESC, c.valid_to ASC
    `;

    const result = userId
      ? await pool.query(query, [userId])
      : await pool.query(query);

    res.json({
      success: true,
      data: {
        coupons: result.rows,
        count: result.rows.length
      }
    });
  } catch (error) {
    console.error('Get available coupons error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách mã khả dụng', error: error.message });
  }
};

// GET /api/coupons/validate/:code - Validate đơn giản (backward compat)
exports.validateCoupon = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query(
      `SELECT c.*,
              COALESCE(actual_usage.cnt, 0)::int AS actual_used_count
       FROM coupons c
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS cnt FROM coupon_usage WHERE coupon_id = c.id
       ) actual_usage ON true
       WHERE c.code = $1 AND c.is_active = true
       AND c.valid_from <= NOW() AND c.valid_to >= NOW()
       AND COALESCE(actual_usage.cnt, 0) < c.max_uses`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mã giảm giá không hợp lệ hoặc đã hết hạn'
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ success: false, message: 'Lỗi kiểm tra mã giảm giá' });
  }
};

// POST /api/coupons/validate - Validate kèm check đơn tối thiểu
exports.validateCouponForCheckout = async (req, res) => {
  const client = await pool.connect();
  try {
    // Accept both snake_case (order_total) and camelCase (orderTotal) for backward compat.
    const { code, order_total, orderTotal = 0 } = req.body;
    const finalOrderTotal = order_total != null ? order_total : orderTotal;
    if (!code || typeof code !== 'string') {
      if (client) client.release();
      return res.status(400).json({ success: false, message: 'Mã giảm giá không hợp lệ' });
    }

    const result = await client.query(
      `SELECT c.*,
              COALESCE(actual_usage.cnt, 0)::int AS actual_used_count
       FROM coupons c
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS cnt FROM coupon_usage WHERE coupon_id = c.id
       ) actual_usage ON true
       WHERE UPPER(c.code) = UPPER($1) AND c.is_active = true
       AND c.valid_from <= NOW() AND c.valid_to >= NOW()
       AND COALESCE(actual_usage.cnt, 0) < c.max_uses`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mã giảm giá không hợp lệ, đã hết hạn hoặc đã hết lượt sử dụng'
      });
    }

    const coupon = result.rows[0];
    const minOrderValue = Number(coupon.min_order_amount || 0);

    if (Number(finalOrderTotal) < minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Mã này yêu cầu đơn tối thiểu ${new Intl.NumberFormat('vi-VN').format(minOrderValue)}đ`
      });
    }

    // Kiểm tra giới hạn usage_per_user nếu có
    if (coupon.usage_per_user !== null) {
      const userId = req.user?.id;
      if (userId) {
        const usageCountResult = await client.query(
          `SELECT COUNT(*)::int as used_count
           FROM coupon_usage
           WHERE user_id = $1 AND coupon_id = $2`,
          [userId, coupon.id]
        );
        const userUsedCount = usageCountResult.rows[0].used_count;
        if (userUsedCount >= coupon.usage_per_user) {
          return res.status(400).json({
            success: false,
            message: `Bạn đã sử dụng mã này ${userUsedCount} lần. Mã này chỉ cho phép dùng tối đa ${coupon.usage_per_user} lần/tài khoản.`
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Áp dụng mã giảm giá thành công',
      data: { coupon }
    });
  } catch (error) {
    console.error('Validate coupon (checkout) error:', error);
    res.status(500).json({ success: false, message: 'Lỗi kiểm tra mã giảm giá' });
  } finally {
    client.release();
  }
};

// GET /api/coupons/my-coupons - User đang đăng nhập: các mã CÓ THỂ dùng (đã gán cho user, chưa dùng, còn hạn)
exports.getMyCoupons = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }
    const result = await pool.query(
      `SELECT
         uc.id              AS user_coupon_id,
         uc.assigned_at,
         uc.expires_at,
         uc.is_used,
         uc.used_at,
         uc.used_order_id,
         c.id               AS coupon_id,
         c.code,
         c.description,
         c.discount_percent,
         c.max_discount,
         c.min_order_amount,
         c.max_uses,
         -- Nguồn chính xác: COUNT từ coupon_usage
         COALESCE((SELECT COUNT(*)::int FROM coupon_usage WHERE coupon_id = c.id), 0) AS used_count,
         c.usage_per_user,
         c.valid_from,
         c.valid_to,
         c.is_active,
         -- Số lần user đã dùng mã này
         (
           SELECT COUNT(*)::int FROM coupon_usage cu
           WHERE cu.user_id = $1 AND cu.coupon_id = c.id
         ) AS user_used_count,
         -- Số lần còn lại user có thể dùng
         CASE
           WHEN c.usage_per_user IS NULL THEN NULL
           ELSE GREATEST(c.usage_per_user - (
             SELECT COUNT(*) FROM coupon_usage cu2
             WHERE cu2.user_id = $1 AND cu2.coupon_id = c.id
           ), 0)
         END AS user_remaining_uses,
         -- Số lượt còn lại tổng
         (c.max_uses - COALESCE((SELECT COUNT(*)::int FROM coupon_usage WHERE coupon_id = c.id), 0)) AS remaining_uses,
         -- Số user tối đa có thể dùng mã
         CASE
           WHEN c.usage_per_user IS NULL OR c.usage_per_user = 0 THEN NULL
           ELSE FLOOR(c.max_uses::numeric / c.usage_per_user)::int
         END AS max_reachable_users
       FROM user_coupons uc
       JOIN coupons c ON c.id = uc.coupon_id
       WHERE uc.user_id = $1
         AND uc.is_used = false
         AND c.is_active = true
         AND (c.valid_from IS NULL OR c.valid_from <= NOW())
         AND (c.valid_to   IS NULL OR c.valid_to   > NOW())
         AND COALESCE((SELECT COUNT(*)::int FROM coupon_usage WHERE coupon_id = c.id), 0) < c.max_uses
         AND (
           c.usage_per_user IS NULL
           OR (
             SELECT COUNT(*)::int FROM coupon_usage cu3
             WHERE cu3.user_id = $1 AND cu3.coupon_id = c.id
           ) < c.usage_per_user
         )
       ORDER BY c.discount_percent DESC, c.valid_to ASC`,
      [userId]
    );
    res.json({ success: true, data: { coupons: result.rows } });
  } catch (error) {
    console.error('Get my coupons error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách mã giảm giá của tôi', error: error.message });
  }
};

// GET /api/coupons/my-used-coupons - Các mã user đã sử dụng
exports.getMyUsedCoupons = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }
    const result = await pool.query(
      `SELECT
         uc.id              AS user_coupon_id,
         uc.used_at,
         uc.used_order_id,
         c.id               AS coupon_id,
         c.code,
         c.description,
         c.discount_percent,
         c.max_discount,
         c.min_order_amount,
         c.max_uses,
         c.usage_per_user,
         c.valid_from,
         c.valid_to,
         (
           SELECT COUNT(*)::int FROM coupon_usage cu
           WHERE cu.user_id = $1 AND cu.coupon_id = c.id
         ) AS user_used_count
       FROM user_coupons uc
       JOIN coupons c ON c.id = uc.coupon_id
       WHERE uc.user_id = $1 AND uc.is_used = true
       ORDER BY uc.used_at DESC`,
      [userId]
    );
    res.json({ success: true, data: { coupons: result.rows } });
  } catch (error) {
    console.error('Get my used coupons error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy lịch sử mã giảm giá', error: error.message });
  }
};

// POST /api/coupons - Admin tạo
exports.createCoupon = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      code, discount_percent, max_discount,
      max_uses, valid_from, valid_to,
      description, is_active = true,
      usage_per_user = null, is_public = true
    } = req.body;

    if (!code || !discount_percent || !valid_from || !valid_to) {
      return res.status(400).json({ success: false, message: 'Thiếu trường bắt buộc' });
    }

    if (discount_percent < 1 || discount_percent > 100) {
      return res.status(400).json({ success: false, message: 'Phần trăm giảm giá phải từ 1-100' });
    }
    if (usage_per_user !== null && (usage_per_user < 1 || !Number.isInteger(usage_per_user))) {
      return res.status(400).json({ success: false, message: 'Số lần dùng/tài khoản phải là số nguyên dương hoặc để trống (không giới hạn)' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO coupons
       (code, discount_percent, max_discount, max_uses, valid_from, valid_to, description, is_active, usage_per_user, is_public)
       VALUES (UPPER($1), $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [code, discount_percent, max_discount, max_uses, valid_from, valid_to, description, is_active, usage_per_user, is_public]
    );

    const newCoupon = result.rows[0];

    if (req.user?.id) {
      await client.query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
        [req.user.id, 'COUPON_CREATE', `Tạo mã giảm giá: ${code}`]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: { coupon: newCoupon }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create coupon error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Mã giảm giá đã tồn tại' });
    }
    res.status(500).json({ success: false, message: 'Lỗi tạo mã giảm giá' });
  } finally {
    client.release();
  }
};

// PUT /api/coupons/:id - Admin cập nhật
exports.updateCoupon = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      code, discount_percent, max_discount,
      max_uses, valid_from, valid_to,
      description, is_active,
      usage_per_user, is_public
    } = req.body;

    // Build dynamic SET clause, ignoring empty strings for nullable fields
    const setClauses = [];
    const params = [];
    let idx = 1;

    if (code !== undefined && code !== null && code !== '') {
      setClauses.push(`code = UPPER($${idx++})`);
      params.push(code);
    }
    if (discount_percent !== undefined && discount_percent !== null) {
      setClauses.push(`discount_percent = $${idx++}`);
      params.push(discount_percent);
    }
    if (max_discount !== undefined && max_discount !== null) {
      setClauses.push(`max_discount = $${idx++}`);
      params.push(max_discount);
    }
    if (max_uses !== undefined && max_uses !== null) {
      setClauses.push(`max_uses = $${idx++}`);
      params.push(max_uses);
    }
    if (valid_from !== undefined && valid_from !== null && valid_from !== '') {
      setClauses.push(`valid_from = $${idx++}`);
      params.push(valid_from);
    }
    if (valid_to !== undefined && valid_to !== null && valid_to !== '') {
      setClauses.push(`valid_to = $${idx++}`);
      params.push(valid_to);
    }
    if (description !== undefined && description !== null) {
      setClauses.push(`description = $${idx++}`);
      params.push(description);
    }
    if (is_active !== undefined && is_active !== null) {
      setClauses.push(`is_active = $${idx++}`);
      params.push(is_active);
    }
    if (is_public !== undefined) {
      setClauses.push(`is_public = $${idx++}`);
      params.push(is_public);
    }
    if (usage_per_user !== undefined) {
      if (usage_per_user !== null && (usage_per_user < 1 || !Number.isInteger(usage_per_user))) {
        return res.status(400).json({ success: false, message: 'Số lần dùng/tài khoản phải là số nguyên dương hoặc null (không giới hạn)' });
      }
      setClauses.push(`usage_per_user = $${idx++}`);
      params.push(usage_per_user);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có trường nào để cập nhật' });
    }

    params.push(id);

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE coupons SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${idx}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá' });
    }
    const updated = result.rows[0];

    if (req.user?.id) {
      await client.query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
        [req.user.id, 'COUPON_UPDATE', `Cập nhật mã giảm giá: ${code || updated.code}`]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      data: { coupon: updated }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update coupon error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Mã giảm giá đã tồn tại' });
    }
    res.status(500).json({ success: false, message: 'Lỗi cập nhật mã giảm giá' });
  } finally {
    client.release();
  }
};

// PATCH /api/coupons/:id/toggle - Admin đổi trạng thái
exports.toggleCouponStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const result = await client.query(
      `UPDATE coupons SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active, code, valid_to`,
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã' });
    }

    const updated = result.rows[0];

    await client.query('COMMIT');

    res.json({
      success: true,
      message: updated.is_active ? 'Mã giảm giá đã được kích hoạt' : 'Mã giảm giá đã bị vô hiệu hóa',
      data: updated
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Toggle coupon error:', error);
    res.status(500).json({ success: false, message: 'Lỗi đổi trạng thái' });
  } finally {
    client.release();
  }
};

// DELETE /api/coupons/:id - Admin xóa
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM coupons WHERE id = $1 RETURNING code', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã giảm giá' });
    }

    if (req.user?.id) {
      await pool.query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
        [req.user.id, 'COUPON_DELETE', `Xóa mã giảm giá: ${result.rows[0].code}`]
      );
    }

    res.json({ success: true, message: 'Xóa mã giảm giá thành công' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa mã giảm giá' });
  }
};
