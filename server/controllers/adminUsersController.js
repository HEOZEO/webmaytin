const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const { unlockAccount, getLockoutStatus } = require('../utils/accountLockout');
const { DEFAULT_STAFF_PERMISSIONS } = require('../middleware/auth');

// ============================================================
// Helper: Check if actor can manage target user (for staff)
// - staff can manage customers only
// - admin can manage anyone (except last admin self-lock)
// ============================================================
const canManageUser = (actor, target) => {
  if (!actor) return false;
  if (actor.role === 'admin') return true;
  if (actor.role === 'staff') {
    // staff chỉ được quản lý customer
    return target && target.role === 'customer';
  }
  return false;
};

// Get all users with pagination
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role = '', search = '', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;
    const validSortFields = ['created_at', 'full_name', 'email', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    let whereClause = 'WHERE email NOT LIKE \'%_deleted_%\'';
    const params = [];

    if (role && role !== 'all') {
      whereClause += ` AND role = $${params.length + 1}`;
      params.push(role);
    }

    if (search) {
      whereClause += ` AND (full_name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 2})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Staff không được xem tài khoản admin khác (chỉ thấy customer + staff)
    if (req.user.role === 'staff') {
      whereClause += ` AND role = 'customer'`;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated results
    let query = `
      SELECT
        id, email, username, full_name, phone, address, role, is_active,
        last_login, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY ${sortField} ${validOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

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
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách người dùng', error: error.message });
  }
};

// Get user details
exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Staff không được xem chi tiết admin
    if (req.user.role === 'staff') {
      const checkRole = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
      if (checkRole.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Người dùng không tìm thấy' });
      }
      if (checkRole.rows[0].role !== 'customer') {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem thông tin tài khoản này' });
      }
    }

    const userResult = await pool.query(
      `SELECT id, email, username, full_name, phone, address, role, is_active, last_login, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Người dùng không tìm thấy' });
    }

    // Get customer orders
    const ordersResult = await pool.query(
      `SELECT COUNT(*) as total_orders, COALESCE(SUM(final_amount), 0) as total_spent
       FROM orders WHERE user_id = $1`,
      [id]
    );

    // Get customer addresses
    const addressesResult = await pool.query(
      `SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        user: userResult.rows[0],
        orderStats: ordersResult.rows[0],
        addresses: addressesResult.rows
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy thông tin người dùng', error: error.message });
  }
};

// Update user info
exports.updateUserInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, address } = req.body;

    // Staff chỉ được sửa thông tin customer
    if (req.user.role === 'staff') {
      const checkRole = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
      if (checkRole.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Người dùng không tìm thấy' });
      }
      if (checkRole.rows[0].role !== 'customer') {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa tài khoản này' });
      }
    }

    const result = await pool.query(
      `UPDATE users
       SET full_name = COALESCE($2, full_name),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, full_name, phone, address, role, is_active`,
      [id, full_name, phone, address]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Người dùng không tìm thấy' });
    }

    res.json({ success: true, message: 'Cập nhật thông tin người dùng thành công', data: result.rows[0] });
  } catch (error) {
    console.error('Update user info error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật thông tin người dùng', error: error.message });
  }
};

// Update user role (admin only — enforced at route level)
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['customer', 'staff', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ' });
    }

    // Prevent changing admin to other roles (safety)
    if (req.user.id === parseInt(id) && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Không thể thay đổi vai trò của chính mình' });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Người dùng không tìm thấy' });
    }

    res.json({ success: true, message: 'Cập nhật vai trò thành công', data: result.rows[0] });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật vai trò', error: error.message });
  }
};

// Lock/Unlock user account
// - admin: có thể khoá/mở bất kỳ ai (trừ chính mình)
// - staff: chỉ được khoá/mở customer (không khoá admin/staff khác, không khoá chính mình)
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const targetId = parseInt(id, 10);

    // Prevent locking own account
    if (req.user.id === targetId) {
      return res.status(400).json({ success: false, message: 'Không thể khóa tài khoản của chính mình' });
    }

    const currentUser = await pool.query(
      'SELECT id, role, is_active, full_name FROM users WHERE id = $1',
      [targetId]
    );
    if (currentUser.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Người dùng không tìm thấy' });
    }

    const target = currentUser.rows[0];

    // Staff chỉ được khoá/mở customer
    if (!canManageUser(req.user, target)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thay đổi trạng thái tài khoản này'
      });
    }

    // Don't let the last active admin be locked
    if (target.role === 'admin' && target.is_active) {
      const otherAdmins = await pool.query(
        `SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND is_active = TRUE AND id != $1`,
        [targetId]
      );
      if (parseInt(otherAdmins.rows[0].cnt, 10) === 0) {
        return res.status(400).json({ success: false, message: 'Không thể khóa admin cuối cùng đang hoạt động' });
      }
    }

    const newStatus = !target.is_active;

    const result = await pool.query(
      `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, is_active, role`,
      [newStatus, targetId]
    );

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [req.user.id, newStatus ? 'ADMIN_UNLOCK_USER' : 'ADMIN_LOCK_USER', `${newStatus ? 'Mở khóa' : 'Khóa'} tài khoản #${targetId} (${target.full_name})`]
    ).catch(err => console.warn('Activity log error:', err.message));

    res.json({
      success: true,
      message: newStatus ? 'Tài khoản đã được mở khóa' : 'Tài khoản đã bị khóa',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ success: false, message: 'Lỗi thay đổi trạng thái tài khoản', error: error.message });
  }
};

// Get user order history
exports.getUserOrderHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Staff chỉ được xem đơn hàng của customer
    if (req.user.role === 'staff') {
      const checkRole = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
      if (checkRole.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
      }
      if (checkRole.rows[0].role !== 'customer') {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem lịch sử đơn hàng của tài khoản này' });
      }
    }

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM orders WHERE user_id = $1',
      [id]
    );
    const totalCount = parseInt(countResult.rows[0].total);

    const result = await pool.query(
      `SELECT
        o.id, o.status, o.final_amount, o.created_at, o.updated_at,
        COUNT(oi.id) as item_count
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

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
    console.error('Get user order history error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy lịch sử đơn hàng', error: error.message });
  }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    // Staff chỉ thấy stats của customer
    const statsFilter = req.user.role === 'staff' 
      ? `WHERE role = 'customer' AND email NOT LIKE '%_deleted_%'` 
      : `WHERE email NOT LIKE '%_deleted_%'`;
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'customer' THEN 1 END) as total_customers,
        COUNT(CASE WHEN role = 'staff' THEN 1 END) as total_staff,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admin,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30days
      FROM users ${statsFilter}
    `);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy thống kê người dùng', error: error.message });
  }
};

// Unlock a user account (admin/staff action — but staff only for customers)
exports.unlockUserAccount = async (req, res) => {
  try {
    const { userId } = req.params;

    const userResult = await pool.query(
      'SELECT id, email, full_name, role, is_account_locked FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    const user = userResult.rows[0];

    if (!canManageUser(req.user, user)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền mở khóa tài khoản này' });
    }

    // Unlock account
    const unlocked = await unlockAccount(userId);

    if (unlocked) {
      // Log admin action
      await pool.query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
        [req.user.id, 'ADMIN_UNLOCK_USER', `Mở khóa tài khoản người dùng ${user.full_name}`]
      );

      res.json({
        success: true,
        message: `Đã mở khóa tài khoản ${user.full_name}`,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          isLocked: false
        }
      });
    } else {
      res.status(500).json({ success: false, message: 'Lỗi mở khóa tài khoản' });
    }
  } catch (error) {
    console.error('Unlock user account error:', error);
    res.status(500).json({ success: false, message: 'Lỗi mở khóa tài khoản', error: error.message });
  }
};

// Get user lockout status
exports.getUserLockoutStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.role === 'staff') {
      const checkRole = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (checkRole.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
      }
      if (checkRole.rows[0].role !== 'customer') {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem thông tin khóa tài khoản này' });
      }
    }

    const userResult = await pool.query(
      'SELECT id, full_name, role, is_account_locked, failed_login_attempts FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    const lockoutStatus = await getLockoutStatus(userId);

    res.json({
      success: true,
      data: {
        user: userResult.rows[0],
        lockout: lockoutStatus
      }
    });
  } catch (error) {
    console.error('Get user lockout status error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy trạng thái khóa tài khoản', error: error.message });
  }
};

// Create new user (admin function — staff can create but only customer)
exports.createUser = async (req, res) => {
  try {
    const { email, password, full_name, phone, address, role } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp Email, Mật khẩu và Họ tên' });
    }

    const validRoles = ['customer', 'staff', 'admin'];
    let userRole = validRoles.includes(role) ? role : 'customer';

    // Staff chỉ được tạo customer
    if (req.user.role === 'staff' && userRole !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Nhân viên chỉ được tạo tài khoản khách hàng'
      });
    }

    const username = email.split('@')[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    // Nếu tạo staff → set default permissions (admin có thể chỉnh sau)
    // Admin → all: true
    // Customer → {} (không cần permissions)
    let defaultPerms = {};
    if (userRole === 'staff') {
      defaultPerms = DEFAULT_STAFF_PERMISSIONS;
    } else if (userRole === 'admin') {
      defaultPerms = { all: true };
    }

    const result = await pool.query(
      `INSERT INTO users (email, username, password, full_name, phone, address, role, is_active, permissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8::jsonb)
       RETURNING id, email, username, full_name, phone, address, role, is_active, created_at`,
      [email, username, hashedPassword, full_name, phone || 'Chưa cập nhật', address || 'Chưa cập nhật', userRole, JSON.stringify(defaultPerms)]
    );

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản người dùng mới thành công',
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Email hoặc Username đã tồn tại' });
    }
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo người dùng mới', error: error.message });
  }
};

// Delete (soft-delete) user (admin only — enforced at route level)
exports.deleteUser = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const userId = parseInt(id, 10);

    if (req.user.id === userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản của chính mình' });
    }

    // Check existence + role for safety
    const check = await client.query('SELECT id, role, is_active, full_name FROM users WHERE id = $1', [userId]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }
    const target = check.rows[0];

    // Don't let the last admin be removed
    if (target.role === 'admin' && target.is_active) {
      const otherAdmins = await client.query(
        `SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND is_active = TRUE AND id != $1`,
        [userId]
      );
      if (parseInt(otherAdmins.rows[0].cnt, 10) === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Không thể xóa admin cuối cùng' });
      }
    }

    // SOFT DELETE (preserves FK & history)
    const result = await client.query(
      `UPDATE users
       SET is_active = FALSE,
           email = email || '_deleted_' || id || '_' || EXTRACT(epoch FROM NOW())::bigint
       WHERE id = $1
       RETURNING id`,
      [userId]
    );

    await client.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [req.user.id, 'USER_DELETE', `Vô hiệu hóa tài khoản #${userId} (${target.full_name})`]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Đã vô hiệu hóa tài khoản ${target.full_name || ''} (giữ lại lịch sử đơn hàng)`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Lỗi vô hiệu hóa tài khoản' });
  } finally {
    client.release();
  }
};

// ============================================================
// PERMISSIONS MANAGEMENT (admin only)
// ============================================================

// Lấy default permissions template cho staff
exports.getDefaultPermissions = async (req, res) => {
  try {
    res.json({
      success: true,
      data: DEFAULT_STAFF_PERMISSIONS
    });
  } catch (error) {
    console.error('Get default permissions error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy quyền mặc định' });
  }
};

// Lấy permissions của 1 user
exports.getUserPermissions = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }

    const result = await pool.query(
      'SELECT id, email, full_name, role, permissions FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    const target = result.rows[0];

    // Admin không thể chỉnh permissions của admin khác (admin luôn full quyền)
    // Chỉ staff mới có permissions configurable
    const isConfigurable = target.role === 'staff';

    res.json({
      success: true,
      data: {
        userId: target.id,
        email: target.email,
        fullName: target.full_name,
        role: target.role,
        permissions: target.permissions || {},
        isConfigurable,
        defaults: DEFAULT_STAFF_PERMISSIONS
      }
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy quyền người dùng' });
  }
};

// Cập nhật permissions cho staff
exports.updateUserPermissions = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }

    const { permissions } = req.body;
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp permissions hợp lệ' });
    }

    await client.query('BEGIN');

    const check = await client.query('SELECT id, role, full_name FROM users WHERE id = $1', [userId]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    const target = check.rows[0];

    // Chỉ cho phép cập nhật permissions của staff
    if (target.role !== 'staff') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể cấu hình quyền cho nhân viên. Admin luôn có toàn quyền.'
      });
    }

    // Không thể thay đổi role của chính mình
    if (userId === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Không thể thay đổi quyền của chính bạn'
      });
    }

    await client.query(
      `UPDATE users SET permissions = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(permissions), userId]
    );

    await client.query(
      `INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)`,
      [req.user.id, 'UPDATE_USER_PERMISSIONS',
       `[ADMIN] ${req.user.full_name || req.user.email} đã cập nhật quyền cho nhân viên #${userId} (${target.full_name})`]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Đã cập nhật quyền cho ${target.full_name}`,
      data: { userId, permissions }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update user permissions error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật quyền', error: error.message });
  } finally {
    client.release();
  }
};