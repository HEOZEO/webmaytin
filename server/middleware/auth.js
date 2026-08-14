const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

exports.protect = async (req, res, next) => {
  let token;

  // Extract token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7); // Remove 'Bearer ' prefix
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
  }

  try {
    // jwt.verify() automatically checks token expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is expired (exp claim is automatically verified by jwt.verify)
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ success: false, message: 'Token đã hết hạn' });
    }
    
    const result = await pool.query(
      'SELECT id, email, username, full_name, role, phone, address, is_active, permissions FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User không tồn tại' });
    }

    // Check if user account is active
    if (!result.rows[0].is_active) {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token đã hết hạn' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }
    return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
  }
};


exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} không có quyền truy cập`
      });
    }
    next();
  };
};

// Admin middleware - shorthand for authorize('admin')
exports.admin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Chỉ admin mới có quyền truy cập'
    });
  }
  next();
};

// Alias: adminOnly = admin
exports.adminOnly = exports.admin;

// Staff middleware - for staff and admin
exports.staff = (req, res, next) => {
  if (!['staff', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ staff hoặc admin mới có quyền truy cập'
    });
  }
  next();
};

/**
 * Permission middleware factory — kiểm tra user có quyền cụ thể không
 *
 * Cách dùng:
 *   router.get('/products', protect, hasPermission('products.view'), controller)
 *   router.delete('/products/:id', protect, hasPermission('products.delete'), controller)
 *
 * Admin luôn được phép (override).
 * Nếu user không có permission đúng cấu trúc, trả về 403.
 */
exports.hasPermission = (permKey) => {
  return (req, res, next) => {
    // Admin luôn có toàn quyền
    if (req.user.role === 'admin') return next();

    // Customer không có permission admin
    if (req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập'
      });
    }

    const perms = req.user.permissions || {};

    // Check wildcard (all: true)
    if (perms.all === true) return next();

    // Parse permission key path: "products.delete" => perms.products.delete
    const parts = permKey.split('.');
    let cur = perms;
    for (const part of parts) {
      if (cur === null || cur === undefined || typeof cur !== 'object') {
        return res.status(403).json({
          success: false,
          message: `Bạn không có quyền "${permKey}". Vui lòng liên hệ admin.`,
          requiredPermission: permKey
        });
      }
      cur = cur[part];
    }

    if (cur === true) return next();

    return res.status(403).json({
      success: false,
      message: `Bạn không có quyền "${permKey}". Vui lòng liên hệ admin.`,
      requiredPermission: permKey
    });
  };
};

/**
 * Default permissions cho staff role (dùng khi tạo mới)
 */
exports.DEFAULT_STAFF_PERMISSIONS = {
  dashboard: true,
  products: { view: true, create: true, update: true, delete: false, bulk_stock: true },
  orders: { view: true, create: true, update_status: true, cancel: true, delete: false, export: false },
  inventory: { view: true, update: true },
  users: { view: true, lock_customer: true },
  analytics: { view: true },
  contacts: { view: true, reply: true, delete: false }
};
