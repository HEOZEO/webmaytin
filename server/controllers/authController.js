const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { sendEmail } = require('../config/email');
const { validatePasswordStrength } = require('../utils/passwordValidator');
const { isAccountLocked, recordFailedAttempt, resetFailedAttempts, getLockoutStatus } = require('../utils/accountLockout');
const { sanitizeInput } = require('../utils/sanitizer');

const normalizeEmail = (email = '') => email.trim().toLowerCase();

// Cryptographically secure 6-digit OTP (zero-padded)
const generateOtp = () => {
  const buf = crypto.randomBytes(4);
  // Map bytes to a 6-digit number (000000-999999)
  const n = buf.readUInt32BE(0) % 1000000;
  return n.toString().padStart(6, '0');
};

// Hash an OTP for storage. Plain-text OTP is NEVER stored.
const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

const generateToken = (id, remember = true) => {
  const expiresIn = remember
    ? process.env.JWT_EXPIRE || '7d'
    : process.env.JWT_EXPIRE_SHORT || '2h';
  return jwt.sign({ id, remember }, process.env.JWT_SECRET, {
    expiresIn
  });
};

exports.register = async (req, res) => {
  try {
    const { password, full_name, phone, address } = req.body;
    const email = normalizeEmail(req.body.email);
    const safeFullName = sanitizeInput(full_name || '').trim();
    const safePhone = sanitizeInput(phone || '').trim();
    const safeAddress = sanitizeInput(address || '').trim();

    // Check if user exists
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password, full_name, phone, address, role) 
       VALUES ($1, $2, $3, $4, $5, 'customer') 
       RETURNING id, email, full_name, role, phone, address`,
      [email, hashedPassword, safeFullName, safePhone, safeAddress]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    // Send welcome email
    try {
      await sendEmail({
        to: email,
        subject: 'Chào mừng đến với Laptop Store',
        html: `
          <h2>Xin chào ${safeFullName}!</h2>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại Laptop Store.</p>
          <p>Bạn có thể bắt đầu mua sắm ngay bây giờ!</p>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // Log activity (without PII)
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [user.id, 'USER_REGISTER', 'Người dùng đã đăng ký tài khoản']
    );

    res.status(201).json({
      success: true,
      token,
      user
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Lỗi đăng ký' });
  }
};

exports.login = async (req, res) => {
  try {
    const password = req.body.password;
    const identifier = (req.body.email || req.body.username || '').trim();
    const remember = req.body.remember !== false; // mặc định true nếu client không gửi
    const clientIp = req.ip || req.connection.remoteAddress;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email/tên đăng nhập và mật khẩu' });
    }

    const isEmail = identifier.includes('@');
    const lookupColumn = isEmail ? 'email' : 'username';
    const lookupValue = isEmail ? identifier.toLowerCase() : identifier;

    // Check user
    const result = await pool.query(
      `SELECT * FROM users WHERE ${lookupColumn} = $1`,
      [lookupValue]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Email/tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const user = result.rows[0];

    // Check if account is active (admin/staff locked this account)
    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_LOCKED',
        message: 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ bộ phận hỗ trợ để được mở khoá.',
        locked: true
      });
    }

    // Check if account is locked (too many failed attempts)
    const locked = await isAccountLocked(user.id);
    if (locked) {
      const lockoutStatus = await getLockoutStatus(user.id);
      const remainingMinutes = Math.ceil(lockoutStatus.remainingTime / 60);
      return res.status(423).json({
        success: false,
        code: 'ACCOUNT_TEMP_LOCKED',
        message: `Tài khoản bị khóa. Vui lòng thử lại sau ${remainingMinutes} phút.`,
        locked: true,
        remainingTime: lockoutStatus.remainingTime
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Record failed attempt
      const lockoutResult = await recordFailedAttempt(user.id, clientIp);

      if (lockoutResult && lockoutResult.isLocked) {
        return res.status(423).json({
          success: false,
          message: `Tài khoản bị khóa sau ${lockoutResult.attempts} lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.`,
          locked: true,
          attempts: lockoutResult.attempts
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Email/tên đăng nhập hoặc mật khẩu không đúng',
        attempts: lockoutResult ? lockoutResult.attempts : 0
      });
    }

    // Successful login - reset failed attempts
    await resetFailedAttempts(user.id);

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Log activity (without PII)
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [user.id, 'USER_LOGIN', 'Người dùng đã đăng nhập']
    );

    const token = generateToken(user.id, remember);

    // Return user info without password
    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone,
      address: user.address,
      permissions: user.permissions || {},
      created_at: user.created_at
    };

    res.json({
      success: true,
      token,
      remember,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Lỗi đăng nhập' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, full_name, role, phone, address, permissions, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy thông tin' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone, address } = req.body;

    const safeFullName = sanitizeInput(full_name || '').trim();
    const safePhone = sanitizeInput(phone || '').trim();
    const safeAddress = sanitizeInput(address || '').trim();

    if (!safeFullName) {
      return res.status(400).json({ success: false, message: 'Họ tên không được để trống' });
    }

    const result = await pool.query(
      `UPDATE users
       SET full_name = $1, phone = $2, address = $3
       WHERE id = $4
       RETURNING id, email, full_name, role, phone, address`,
      [safeFullName, safePhone, safeAddress, req.user.id]
    );

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật thông tin' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(new_password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: passwordValidation.message 
      });
    }

    // Get current password
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    // Check current password
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // Update password
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Lỗi đổi mật khẩu' });
  }
};

// Forgot Password - Sửa lỗi: hash token trước khi lưu DB
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    const userResult = await pool.query('SELECT id, full_name FROM users WHERE email = $1', [normalizedEmail]);

    // Bảo mật: trả về success ngay cả khi email không tồn tại (tránh email enumeration)
    if (userResult.rows.length === 0) {
      console.log(`[ForgotPassword] Email not found: ${normalizedEmail}`);
      return res.json({ success: true, message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.' });
    }

    const user = userResult.rows[0];
    // SECURITY: Tạo random token và hash nó trước khi lưu DB
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expire = $2 WHERE id = $3',
      [hashedToken, expiresAt, user.id]
    );

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: normalizedEmail,
        subject: 'Đặt lại mật khẩu - Laptop Store',
        html: `
          <h2>Xin chào ${user.full_name}!</h2>
          <p>Bạn đã yêu cầu đặt lại mật khẩu.</p>
          <p>Vui lòng click vào link dưới đây để đặt lại mật khẩu (link có hiệu lực trong 1 giờ):</p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#4F46E5;color:white;text-decoration:none;border-radius:5px;">Đặt lại mật khẩu</a>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Vẫn trả success để không lộ thông tin
    }

    res.json({ success: true, message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Reset Password - Sửa lỗi: verify token hash thay vì JWT
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Hash token từ client để so sánh
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const userResult = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expire > NOW()',
      [hashedToken]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    const userId = userResult.rows[0].id;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expire = NULL WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Delete Account - Sửa lỗi: soft-delete để giữ lịch sử đơn hàng
exports.deleteAccount = async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET is_active = false, email = email || \'_deleted_\' || id WHERE id = $1',
      [req.user.id]
    );
    res.json({ success: true, message: 'Tài khoản đã được vô hiệu hóa' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ========== OTP VERIFICATION FOR REGISTER ==========

exports.sendRegisterOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Email không hợp lệ' });
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if email already registered
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email này đã được sử dụng. Vui lòng đăng nhập.' });
    }

    // SECURITY: cryptographically secure OTP, hash before storing
    const otpCode = generateOtp();
    const otpHash = hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate old pending OTPs for this email
    await pool.query(
      `UPDATE otp_codes SET expires_at = NOW() WHERE email = $1 AND purpose = 'register' AND verified = FALSE`,
      [normalizedEmail]
    );

    // Store HASH only
    await pool.query(
      `INSERT INTO otp_codes (email, otp_code, purpose, expires_at) VALUES ($1, $2, 'register', $3)`,
      [normalizedEmail, otpHash, expiresAt]
    );

    // Send plain OTP via email (channel is trusted; DB is not)
    const emailResult = await sendEmail({
        to: normalizedEmail,
        subject: 'Mã xác thực đăng ký - Laptop Store',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f172a; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #06b6d4; margin: 0;">Laptop Store</h2>
            </div>
            <div style="background: #1e293b; border-radius: 12px; padding: 24px; text-align: center;">
              <p style="color: #94a3b8; margin: 0 0 16px; font-size: 14px;">Mã xác thực của bạn:</p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #06b6d4; margin: 16px 0; font-family: monospace;">${otpCode}</div>
              <p style="color: #64748b; font-size: 12px; margin: 16px 0 0;">Mã có hiệu lực trong <strong style="color: #f59e0b;">5 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
            </div>
            <p style="color: #475569; font-size: 12px; text-align: center; margin-top: 16px;">
              Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.
            </p>
          </div>
        `
      });
    if (!emailResult.success && !emailResult.skipped) {
      console.error('OTP email sending failed:', emailResult.error || 'unknown error');
      return res.status(500).json({ success: false, message: 'Không thể gửi mã xác thực. Vui lòng thử lại.' });
    }

    res.json({ success: true, message: 'Mã xác thực đã được gửi đến email của bạn.' });
  } catch (error) {
    console.error('Send register OTP error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server. Vui lòng thử lại.' });
  }
};

exports.verifyRegisterOTP = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Accept both `otp` (frontend convention) and `otp_code` (backend convention).
    const { email, full_name, password, phone } = req.body;
    const otp_code = req.body.otp_code || req.body.otp;

    if (!email || !otp_code || !full_name || !password || !phone) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Thông tin không đầy đủ' });
    }

    const normalizedEmail = normalizeEmail(email);
    const cleanOtp = String(otp_code).trim();
    const otpHash = hashOtp(cleanOtp);

    // Atomic: find a matching OTP by HASH and lock the row
    const otpResult = await client.query(
      `SELECT id, expires_at, verified, attempts FROM otp_codes
       WHERE email = $1 AND purpose = 'register' AND verified = FALSE
         AND expires_at > NOW() AND otp_code = $2
       ORDER BY created_at DESC LIMIT 1
       FOR UPDATE`,
      [normalizedEmail, otpHash]
    );

    if (otpResult.rows.length === 0) {
      // Either no valid OTP, or wrong code. Check attempts for the latest pending OTP.
      const anyOtp = await client.query(
        `SELECT id, verified, expires_at, attempts FROM otp_codes
         WHERE email = $1 AND purpose = 'register'
         ORDER BY created_at DESC LIMIT 1
         FOR UPDATE`,
        [normalizedEmail]
      );

      if (anyOtp.rows.length > 0) {
        const rec = anyOtp.rows[0];
        if (rec.verified) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Mã này đã được sử dụng. Vui lòng gửi lại mã mới.' });
        }
        if (new Date(rec.expires_at) <= new Date()) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Mã xác thực đã hết hạn. Vui lòng gửi lại mã.' });
        }
        // Wrong code, increment attempts with atomic compare to avoid going over 5
        const upd = await client.query(
          `UPDATE otp_codes
           SET attempts = attempts + 1
           WHERE id = $1 AND attempts < 5
           RETURNING attempts`,
          [rec.id]
        );
        const newAttempts = upd.rows[0]?.attempts ?? rec.attempts + 1;
        await client.query('COMMIT');
        if (newAttempts >= 5) {
          return res.status(400).json({ success: false, message: 'Bạn đã nhập sai quá 5 lần. Vui lòng gửi lại mã mới.' });
        }
        return res.status(400).json({ success: false, message: 'Mã xác thực không đúng. Vui lòng kiểm tra lại.' });
      }

      await client.query('COMMIT');
      return res.status(400).json({ success: false, message: 'Mã xác thực không đúng hoặc đã hết hạn. Vui lòng gửi lại mã.' });
    }

    const otpRecord = otpResult.rows[0];

    // Mark OTP as verified atomically (avoid double-use)
    const verifyUpdate = await client.query(
      `UPDATE otp_codes SET verified = TRUE
       WHERE id = $1 AND verified = FALSE
       RETURNING id`,
      [otpRecord.id]
    );

    if (verifyUpdate.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Mã này đã được sử dụng.' });
    }

    const safeFullName = sanitizeInput(full_name || '').trim();
    const safePhone = sanitizeInput(phone || '').trim();

    // Re-check duplicate email (race)
    const userExists = await client.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (userExists.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Email này đã được sử dụng.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo username unique, tránh collision bằng cách thêm hậu số nếu trùng
    let baseUsername = normalizedEmail.split('@')[0].replace(/[^a-z0-9_]/g, '').slice(0, 32) || 'user';
    let username = baseUsername;
    let attempts = 0;
    const MAX_USERNAME_ATTEMPTS = 5;

    while (attempts < MAX_USERNAME_ATTEMPTS) {
      const usernameCheck = await client.query('SELECT 1 FROM users WHERE username = $1 LIMIT 1', [username]);
      if (usernameCheck.rows.length === 0) break;
      attempts++;
      username = `${baseUsername}${crypto.randomInt(1000, 9999)}`;
    }

    if (attempts >= MAX_USERNAME_ATTEMPTS) {
      // Fallback: dùng random id
      username = `user_${crypto.randomInt(100000, 999999)}`;
    }

    // Create user
    const result = await client.query(
      `INSERT INTO users (email, username, password, full_name, phone, address, role, is_active)
       VALUES ($1, $2, $3, $4, $5, '', 'customer', TRUE)
       RETURNING id, email, username, full_name, role, phone`,
      [normalizedEmail, username, hashedPassword, safeFullName, safePhone]
    );

    const user = result.rows[0];

    // Log activity
    await client.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [user.id, 'USER_REGISTER', 'Người dùng đăng ký qua xác thực OTP']
    );

    await client.query('COMMIT');

    const token = generateToken(user.id);

    // Send welcome email AFTER commit (best-effort)
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: 'Chào mừng đến với Laptop Store',
        html: `
          <h2>Xin chào ${safeFullName}!</h2>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại Laptop Store.</p>
          <p>Chúc bạn có những trải nghiệm mua sắm tuyệt vời!</p>
        `
      });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    res.status(201).json({
      success: true,
      token,
      user
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Verify register OTP error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server. Vui lòng thử lại.' });
  } finally {
    client.release();
  }
};
