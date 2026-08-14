const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Check if user is admin
exports.requireAdmin = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Không có token xác thực' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await pool.query(
      'SELECT id, email, username, full_name, role, is_active FROM users WHERE id = $1 AND role = $2',
      [decoded.id, 'admin']
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền truy cập' });
    }

    if (!result.rows[0].is_active) {
      return res.status(403).json({ success: false, message: 'Tài khoản admin đã bị khóa' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc hết hạn' });
  }
};

// Check if user is staff or admin
exports.requireStaff = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Không có token xác thực' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await pool.query(
      'SELECT id, email, username, full_name, role, is_active FROM users WHERE id = $1 AND role IN ($2, $3)',
      [decoded.id, 'admin', 'staff']
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Chỉ staff hoặc admin mới có quyền truy cập' });
    }

    if (!result.rows[0].is_active) {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Staff auth error:', error);
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc hết hạn' });
  }
};

// Admin audit logging middleware
exports.auditLog = (actionType) => {
  return async (req, res, next) => {
    // Store original json to capture request body
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log to database after response
      if (req.user && req.user.role === 'admin') {
        try {
          pool.query(
            `INSERT INTO admin_audit_logs (admin_id, action, entity_type, old_values, new_values, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              req.user.id,
              actionType,
              req.path.split('/')[3],
              JSON.stringify(req.body.old_values || {}),
              JSON.stringify(req.body || {}),
              req.ip,
              req.get('user-agent')
            ]
          ).catch(err => console.error('Audit log error:', err));
        } catch (err) {
          console.error('Audit log error:', err);
        }
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

// Validate admin permissions for specific actions
exports.checkPermission = (requiredAction) => {
  return (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: `Không có quyền: ${requiredAction}` });
    }
    next();
  };
};

// Error handler for admin routes
exports.handleAdminError = (err, req, res, next) => {
  console.error('Admin route error:', err);
  
  if (err.message === 'JWT expired') {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập hết hạn' });
  }
  
  if (err.message === 'invalid token') {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Lỗi server'
  });
};
