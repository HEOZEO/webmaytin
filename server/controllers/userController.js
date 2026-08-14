const { pool } = require('../config/database');

exports.getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT id, email, full_name, role, phone, address, created_at, last_login, is_active
      FROM users
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];
    if (role) {
      countQuery += ' AND role = $1';
      countParams.push(role);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách người dùng' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, email, full_name, role, phone, address, created_at, last_login
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy thông tin người dùng' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['customer', 'staff', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role không hợp lệ' });
    }

    // SAFETY: prevent the last remaining admin from being demoted to non-admin
    if (role !== 'admin') {
      const check = await pool.query(
        `SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND is_active = TRUE AND id != $1`,
        [id]
      );
      if (parseInt(check.rows[0].cnt, 10) === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không thể hạ quyền admin cuối cùng của hệ thống'
        });
      }
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, full_name, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [req.user.id, 'USER_UPDATE_ROLE', `Cập nhật role người dùng ${result.rows[0].email} thành ${role}`]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật role' });
  }
};

/**
 * Delete (deactivate) a user.
 * SECURITY: We do NOT hard-delete users because doing so would cascade-delete
 * their order history (orders.user_id REFERENCES users.id ON DELETE CASCADE),
 * wiping out accounting data, reviews, addresses, etc.
 * Instead we soft-delete: mark is_active = FALSE, rename email to free it up,
 * and stamp deleted_at. The user can no longer log in (auth middleware checks is_active).
 */
exports.deleteUser = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản của chính mình' });
    }

    // SAFETY: don't delete the last active admin
    const adminCheck = await client.query(
      `SELECT role, is_active FROM users WHERE id = $1`,
      [id]
    );
    if (adminCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    if (adminCheck.rows[0].role === 'admin' && adminCheck.rows[0].is_active) {
      const otherAdmins = await client.query(
        `SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND is_active = TRUE AND id != $1`,
        [id]
      );
      if (parseInt(otherAdmins.rows[0].cnt, 10) === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Không thể xóa admin cuối cùng của hệ thống'
        });
      }
    }

    // Soft-delete (preserves FK targets & history)
    const result = await client.query(
      `UPDATE users
       SET is_active = FALSE,
           email = email || '_deleted_' || id || '_' || EXTRACT(epoch FROM NOW())::bigint
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Log activity
    await client.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [req.user.id, 'USER_DELETE', `Vô hiệu hóa người dùng #${id}`]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Đã vô hiệu hóa tài khoản (soft-delete, giữ lại lịch sử đơn hàng)'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Lỗi vô hiệu hóa tài khoản' });
  } finally {
    client.release();
  }
};
