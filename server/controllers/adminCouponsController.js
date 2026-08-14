const { pool } = require('../config/database');

/**
 * Tính toán sức chứa coupon:
 * - max_reachable_users: số user tối đa có thể dùng hết max_uses nếu mỗi user dùng đúng usage_per_user lần
 * - recommended_max_uses: nếu max_uses KHÔNG chia hết cho usage_per_user → gợi ý max_uses = ceil(num_users_target * usage_per_user)
 * - has_unused_slots: true nếu max_uses % usage_per_user != 0
 * - warning: chuỗi cảnh báo cho admin
 */
function computeCouponCapacity(maxUses, usagePerUser) {
  if (!usagePerUser || usagePerUser <= 0) {
    return { max_reachable_users: null, recommended_max_uses: null, has_unused_slots: false, warning: null };
  }
  const reachable = Math.floor(maxUses / usagePerUser);
  const remainder = maxUses % usagePerUser;
  const hasUnused = remainder !== 0;
  // Nếu admin set max_uses=100, usage_per_user=3 → reachable=33, có 1 lượt lẻ
  // recommended = 33*3 = 99 (làm tròn xuống) HOẶC 34*3 = 102 (làm tròn lên)
  // → chọn làm tròn xuống để admin có thể điều chỉnh ý định
  const recommended = reachable * usagePerUser;
  let warning = null;
  if (hasUnused) {
    const numUsers = reachable;
    warning = `Với ${maxUses} lượt tối đa và giới hạn ${usagePerUser} lần/user, chỉ có thể phục vụ tối đa ${numUsers} tài khoản dùng hết (còn thừa ${remainder} lượt không user nào dùng được). Gợi ý: max_uses = ${recommended} (chẵn) hoặc ${numUsers + 1}×${usagePerUser} = ${(numUsers + 1) * usagePerUser} (nếu muốn ${numUsers + 1} user).`;
  }
  return {
    max_reachable_users: reachable,
    recommended_max_uses: recommended,
    has_unused_slots: hasUnused,
    warning
  };
}

// Get all coupons
exports.getCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', search = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    const params = [];

    if (status === 'active') {
      whereConditions.push(`c.is_active = true AND c.valid_to >= NOW()`);
    } else if (status === 'inactive') {
      whereConditions.push(`(c.is_active = false OR c.valid_to < NOW())`);
    } else if (status === 'expired') {
      whereConditions.push(`c.valid_to < NOW()`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(c.code ILIKE $${params.length} OR c.description ILIKE $${params.length})`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM coupons c ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total);

    // Get data with pagination
    params.push(limit, offset);
    const dataQuery = `
      SELECT
        c.id, c.code, c.discount_percent, c.max_discount, c.max_uses,
        c.valid_from, c.valid_to, c.is_active, c.description, c.created_at,
        c.min_order_amount, c.usage_per_user, c.is_public,
        COUNT(cu.id)::int as usage_count,
        -- used_count chính xác = COUNT(coupon_usage) thay vì cột used_count bị lệch
        COUNT(cu.id)::int as used_count,
        -- remaining = max_uses - actual_used
        GREATEST(c.max_uses - COUNT(cu.id), 0)::int as remaining_uses,
        -- max_reachable_users
        CASE
          WHEN c.usage_per_user IS NULL OR c.usage_per_user = 0 THEN NULL
          ELSE FLOOR(c.max_uses::numeric / c.usage_per_user)::int
        END as max_reachable_users,
        -- has_unused_slots
        CASE
          WHEN c.usage_per_user IS NULL OR c.usage_per_user = 0 THEN false
          WHEN (c.max_uses % c.usage_per_user) = 0 THEN false
          ELSE true
        END as has_unused_slots
      FROM coupons c
      LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(dataQuery, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount
      }
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách mã giảm giá', error: error.message });
  }
};

// Get coupon details
exports.getCouponDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const couponResult = await pool.query(
      `SELECT c.*, cu.count as usage_count
       FROM coupons c
       LEFT JOIN LATERAL (SELECT COUNT(*)::int as count FROM coupon_usage WHERE coupon_id = c.id) cu ON true
       WHERE c.id = $1`,
      [id]
    );

    if (couponResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mã giảm giá không tìm thấy' });
    }

    // Get usage details
    const usageResult = await pool.query(
      `SELECT cu.*, u.full_name, u.email, o.id as order_id
       FROM coupon_usage cu
       LEFT JOIN users u ON cu.user_id = u.id
       LEFT JOIN orders o ON cu.order_id = o.id
       WHERE cu.coupon_id = $1
       ORDER BY cu.used_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        coupon: couponResult.rows[0],
        usage: usageResult.rows
      }
    });
  } catch (error) {
    console.error('Get coupon details error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết mã giảm giá', error: error.message });
  }
};

// Create coupon
exports.createCoupon = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      code,
      discount_percent,
      max_discount,
      max_uses,
      usage_limit,
      min_order_amount,
      valid_from,
      starts_at,
      valid_to,
      expires_at,
      description,
      is_active,
      is_public,
      usage_per_user
    } = req.body;

    const finalCode = (code || '').trim().toUpperCase();
    const finalDiscount = Number(discount_percent) || 0;
    const finalMaxUses = Number(max_uses || usage_limit) || 100;
    const finalValidFrom = valid_from || starts_at || new Date().toISOString();
    const defaultExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const finalValidTo = valid_to || expires_at || defaultExpiry;
    const finalMinOrder = Number(min_order_amount) || 0;
    const finalUsagePerUser = usage_per_user === '' || usage_per_user == null ? null : Number(usage_per_user);

    // Validation
    if (!finalCode) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá' });
    }
    if (finalDiscount < 1 || finalDiscount > 100) {
      return res.status(400).json({ success: false, message: 'Phần trăm giảm giá phải từ 1% đến 100%' });
    }
    if (finalMinOrder < 0) {
      return res.status(400).json({ success: false, message: 'Đơn tối thiểu không được âm' });
    }
    if (new Date(finalValidTo) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Ngày hết hạn phải lớn hơn ngày hiện tại' });
    }
    if (finalUsagePerUser !== null && (finalUsagePerUser < 1 || !Number.isInteger(finalUsagePerUser))) {
      return res.status(400).json({ success: false, message: 'Số lần dùng/tài khoản phải là số nguyên dương hoặc để trống' });
    }

    // Tính toán số user tối đa có thể dùng mã (theo max_uses + usage_per_user)
    // + cảnh báo nếu max_uses không chia hết cho usage_per_user (sẽ có lượt lẻ)
    // Optional: nếu admin gửi auto_adjust=true, tự động tăng max_uses lên bội số gần nhất của usage_per_user
    const calculated = computeCouponCapacity(finalMaxUses, finalUsagePerUser);

    // Auto-adjust nếu admin đồng ý (gửi rõ trong body)
    let adjustedMaxUses = finalMaxUses;
    if (req.body.auto_adjust === true && calculated.recommended_max_uses !== null) {
      adjustedMaxUses = calculated.recommended_max_uses;
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO coupons (code, discount_percent, max_discount, max_uses, min_order_amount, valid_from, valid_to, description, is_active, is_public, usage_per_user)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        finalCode,
        finalDiscount,
        max_discount ? Number(max_discount) : null,
        adjustedMaxUses,
        finalMinOrder,
        finalValidFrom,
        finalValidTo,
        description || '',
        is_active !== false,
        req.body.is_public !== false,  // default true
        finalUsagePerUser
      ]
    );

    const newCoupon = result.rows[0];

    // Tự động gán mã cho TẤT CẢ user (model "khuyến mãi công khai")
    await client.query(
      `INSERT INTO user_coupons (user_id, coupon_id, assigned_at, expires_at, is_used)
       SELECT u.id, $1::int, NOW(), $2::timestamptz, false
       FROM users u
       ON CONFLICT (user_id, coupon_id) DO NOTHING`,
      [newCoupon.id, finalValidTo]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Mã giảm giá tạo thành công',
      data: newCoupon,
      // Thông tin tính toán — FE dùng để hiển thị cảnh báo cho admin
      capacity: {
        max_reachable_users: calculated.max_reachable_users,
        recommended_max_uses: calculated.recommended_max_uses,
        has_unused_slots: calculated.has_unused_slots,
        warning: calculated.warning,
        was_adjusted: adjustedMaxUses !== finalMaxUses
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Mã giảm giá đã tồn tại' });
    }
    console.error('Create coupon error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo mã giảm giá', error: error.message });
  } finally {
    client.release();
  }
};

// Update coupon
exports.updateCoupon = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      code,
      discount_percent,
      max_discount,
      max_uses,
      usage_limit,
      min_order_amount,
      valid_from,
      starts_at,
      valid_to,
      expires_at,
      description,
      is_active,
      is_public,
      usage_per_user
    } = req.body;

    await client.query('BEGIN');

    // Lấy trạng thái TRƯỚC KHI update
    const beforeResult = await client.query(
      'SELECT is_active, valid_to FROM coupons WHERE id = $1', [id]
    );
    if (beforeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Mã giảm giá không tìm thấy' });
    }
    const before = beforeResult.rows[0];

    // Build dynamic SET, skip empty strings for code (avoid clobbering with '')
    const setClauses = [];
    const params = [id];
    let idx = 2;

    if (code !== undefined && code !== null && code !== '') {
      setClauses.push(`code = $${idx++}`);
      params.push(String(code).trim().toUpperCase());
    }
    if (discount_percent !== undefined && discount_percent !== null) {
      setClauses.push(`discount_percent = $${idx++}`);
      params.push(Number(discount_percent));
    }
    if (max_discount !== undefined && max_discount !== null) {
      setClauses.push(`max_discount = $${idx++}`);
      params.push(Number(max_discount));
    }
    const finalMaxUses = (max_uses !== undefined || usage_limit !== undefined)
      ? Number(max_uses || usage_limit) : undefined;
    if (finalMaxUses !== undefined && !Number.isNaN(finalMaxUses)) {
      setClauses.push(`max_uses = $${idx++}`);
      params.push(finalMaxUses);
    }
    const finalValidFrom = valid_from || starts_at;
    if (finalValidFrom) {
      setClauses.push(`valid_from = $${idx++}`);
      params.push(finalValidFrom);
    }
    const finalValidTo = valid_to || expires_at;
    if (finalValidTo) {
      setClauses.push(`valid_to = $${idx++}`);
      params.push(finalValidTo);
    }
    if (description !== undefined && description !== null) {
      setClauses.push(`description = $${idx++}`);
      params.push(description);
    }
    if (is_active !== undefined && is_active !== null) {
      setClauses.push(`is_active = $${idx++}`);
      params.push(is_active);
    }
    if (is_public !== undefined && is_public !== null) {
      setClauses.push(`is_public = $${idx++}`);
      params.push(is_public);
    }
    if (min_order_amount !== undefined && min_order_amount !== null) {
      setClauses.push(`min_order_amount = $${idx++}`);
      params.push(Number(min_order_amount) || 0);
    }
    if (usage_per_user !== undefined) {
      const up = usage_per_user === '' || usage_per_user == null ? null : Number(usage_per_user);
      if (up !== null && (up < 1 || !Number.isInteger(up))) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Số lần dùng/tài khoản phải là số nguyên dương hoặc null' });
      }
      setClauses.push(`usage_per_user = $${idx++}`);
      params.push(up);
    }

    if (setClauses.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Không có trường nào để cập nhật' });
    }

    setClauses.push(`updated_at = NOW()`);

    const result = await client.query(
      `UPDATE coupons SET ${setClauses.join(', ')}
       WHERE id = $1
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Mã giảm giá không tìm thấy' });
    }
    const updated = result.rows[0];

    // Verify max_uses không nhỏ hơn số lượt đã dùng thực tế (tính từ coupon_usage)
    const actualUsageResult = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM coupon_usage WHERE coupon_id = $1`,
      [id]
    );
    const actualUsed = actualUsageResult.rows[0].cnt;
    if (updated.max_uses < actualUsed) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Không thể giảm max_uses xuống ${updated.max_uses} vì mã đã được dùng ${actualUsed} lượt.`
      });
    }

    // Tính toán capacity mới
    const capacity = computeCouponCapacity(updated.max_uses, updated.usage_per_user);

    // Sync user_coupons: nếu kích hoạt lại mã → gán lại cho user + khôi phục
    if (is_active === true && before.is_active === false) {
      await client.query(
        `INSERT INTO user_coupons (user_id, coupon_id, assigned_at, expires_at, is_used)
         SELECT u.id, $1::int, NOW(), $2::timestamptz, false
         FROM users u
         ON CONFLICT (user_id, coupon_id)
           DO UPDATE SET is_used = false, used_at = NULL, used_order_id = NULL,
                        expires_at = $2::timestamptz, updated_at = NOW()`,
        [id, updated.valid_to]
      );
    }

    // Sync valid_to
    if (finalValidTo) {
      await client.query(
        `UPDATE user_coupons SET expires_at = $1::timestamptz, updated_at = NOW()
         WHERE coupon_id = $2::int`,
        [finalValidTo, id]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Mã giảm giá cập nhật thành công',
      data: updated,
      capacity: {
        max_reachable_users: capacity.max_reachable_users,
        recommended_max_uses: capacity.recommended_max_uses,
        has_unused_slots: capacity.has_unused_slots,
        warning: capacity.warning,
        actual_used: actualUsed
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Mã giảm giá đã tồn tại' });
    }
    console.error('Update coupon error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật mã giảm giá' });
  } finally {
    client.release();
  }
};

// Delete coupon
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if coupon is used
    const usageResult = await pool.query(
      `SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_id = $1`,
      [id]
    );

    if (parseInt(usageResult.rows[0].count) > 0) {
      return res.status(400).json({ success: false, message: 'Không thể xóa mã giảm giá đã được sử dụng' });
    }

    const result = await pool.query(
      `DELETE FROM coupons WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Mã giảm giá không tìm thấy' });
    }

    res.json({ success: true, message: 'Mã giảm giá đã được xóa' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa mã giảm giá', error: error.message });
  }
};

// Toggle coupon status
exports.toggleCouponStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const before = await client.query(
      'SELECT is_active, valid_to FROM coupons WHERE id = $1', [id]
    );
    if (before.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Mã giảm giá không tìm thấy' });
    }
    const beforeStatus = before.rows[0].is_active;
    const validTo = before.rows[0].valid_to;

    const result = await client.query(
      `UPDATE coupons SET is_active = NOT is_active WHERE id = $1 RETURNING *`,
      [id]
    );

    const updated = result.rows[0];

    // Sync: khi bật lại mã → gán cho user + khôi phục is_used
    if (updated.is_active === true && beforeStatus === false) {
      await client.query(
        `INSERT INTO user_coupons (user_id, coupon_id, assigned_at, expires_at, is_used)
         SELECT u.id, $1::int, NOW(), $2::timestamptz, false
         FROM users u
         ON CONFLICT (user_id, coupon_id)
           DO UPDATE SET is_used = false, used_at = NULL, used_order_id = NULL,
                        expires_at = $2::timestamptz, updated_at = NOW()`,
        [id, validTo]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: updated.is_active ? 'Mã giảm giá đã được kích hoạt' : 'Mã giảm giá đã bị vô hiệu hóa',
      data: updated
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Toggle coupon status error:', error);
    res.status(500).json({ success: false, message: 'Lỗi thay đổi trạng thái mã giảm giá', error: error.message });
  } finally {
    client.release();
  }
};

// Get coupon statistics
exports.getCouponStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_coupons,
        COUNT(CASE WHEN is_active = true AND valid_to >= NOW() THEN 1 END) as active_coupons,
        COUNT(CASE WHEN is_active = false OR valid_to < NOW() THEN 1 END) as inactive_coupons,
        COUNT(CASE WHEN valid_to < NOW() THEN 1 END) as expired_coupons,
        COUNT(CASE WHEN usage_per_user IS NOT NULL THEN 1 END) as limited_per_user,
        COUNT(CASE WHEN usage_per_user IS NULL THEN 1 END) as unlimited_per_user,
        (SELECT COUNT(*) FROM coupon_usage) as total_usage,
        (SELECT COALESCE(SUM(discount_amount), 0) FROM coupon_usage) as total_discount_amount
      FROM coupons
    `);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get coupon stats error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy thống kê mã giảm giá', error: error.message });
  }
};
