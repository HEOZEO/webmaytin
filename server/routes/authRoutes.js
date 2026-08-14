const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
  sendRegisterOTP,
  verifyRegisterOTP
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateProfile
} = require('../middleware/validation');
const { verifyCsrfToken } = require('../middleware/csrf');

// Strict rate limit for sensitive endpoints to prevent brute-force / spam.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút' }
});

// Even stricter for OTP/email-sending to prevent mail-bombing.
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn đã yêu cầu gửi email quá nhiều lần, vui lòng thử lại sau 15 phút' }
});

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/forgot-password', emailLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password', authLimiter, validateResetPassword, resetPassword);

// FIX: route /send-otp was previously aliased to forgotPassword which sends a
// password-reset email. The frontend uses this endpoint to request a registration
// OTP, so the wrong handler would email a reset link instead of an OTP code.
router.post('/send-otp', emailLimiter, sendRegisterOTP);
router.post('/verify-otp', authLimiter, verifyRegisterOTP);

// CSRF token endpoint - generates and returns a fresh CSRF token + cookie
// Route này là GET nhưng CẦN tạo token mới (không phải verify). Nên tự generate,
// không dùng verifyCsrfToken middleware (middleware đó skip GET).
router.get('/csrf-token', (req, res) => {
  const csrfModule = require('../middleware/csrf');
  const crypto = require('crypto');
  const secret = process.env.JWT_SECRET || 'csrf-default-secret';
  const token = crypto.randomBytes(32).toString('hex');
  const signature = crypto.createHmac('sha256', secret).update(token).digest('hex');
  const signed = `${token}.${signature}`;

  res.cookie('_csrf_token', signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  });
  res.setHeader('x-csrf-token', signed);
  res.json({ success: true, csrfToken: signed });
});

router.get('/me', protect, getMe);
router.put('/update-profile', protect, validateUpdateProfile, updateProfile);
router.put('/change-password', protect, validateChangePassword, changePassword);
router.delete('/delete-account', protect, deleteAccount);

module.exports = router;
