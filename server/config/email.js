const nodemailer = require('nodemailer');
require('dotenv').config();

// Kiểm tra nếu email config đầy đủ (giá trị thật, không phải placeholder)
const PLACEHOLDER_PASSWORDS = new Set([
  'your-app-specific-password',
  'your_gmail_app_password_here',
  'your-gmail-app-password-here'
]);

const isPlaceholderPassword = (pass) => {
  if (!pass) return true;
  const normalized = String(pass).trim().toLowerCase();
  if (PLACEHOLDER_PASSWORDS.has(normalized)) return true;
  if (/^your[_-]?/i.test(normalized)) return true;
  if (/change[_-]?me/i.test(normalized)) return true;
  return normalized.replace(/\s+/g, '').length < 16;
};

const isEmailConfigured = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  return (
    user &&
    pass &&
    user !== 'your-email@gmail.com' &&
    user !== 'your-email@example.com' &&
    !isPlaceholderPassword(pass)
  );
};

let transporter = null;

const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log('✅ Email transporter initialized for:', process.env.EMAIL_USER);
  }
  return transporter;
};

// Initial check on file load
getTransporter();

const isDev = () => process.env.NODE_ENV !== 'production';

const sendEmail = async (options) => {
  const activeTransporter = getTransporter();

  // Dev fallback: log email ra console để dev/test luồng quên mật khẩu
  // không cần cấu hình SMTP thật.
  if (!activeTransporter) {
    if (isDev()) {
      console.log('\n📧 ===== DEV EMAIL (SMTP not configured) =====');
      console.log('To     :', options.to);
      console.log('Subject:', options.subject);
      console.log('Body   :');
      // Bỏ các tag HTML để dễ đọc
      const text = String(options.html || '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+\n/g, '\n')
        .trim();
      console.log(text);
      console.log('==============================================\n');
      return { success: true, dev: true };
    }
    console.log('⚠️  Email skipped (not configured):', options.subject);
    return { skipped: true };
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `Laptop Store <${process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html
  };

  try {
    await activeTransporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully to:', options.to);
    return { success: true };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail, isEmailConfigured };