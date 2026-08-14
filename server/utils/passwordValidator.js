/**
 * Password strength validation utility
 * Enforces minimum security requirements for user passwords
 */

const validatePasswordStrength = (password) => {
  const errors = [];
  
  // Check minimum length
  if (password.length < 8) {
    errors.push('Mật khẩu phải có ít nhất 8 ký tự');
  }
  
  // Check maximum length to prevent DoS
  if (password.length > 128) {
    errors.push('Mật khẩu không được vượt quá 128 ký tự');
  }
  
  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất một chữ hoa');
  }
  
  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất một chữ thường');
  }
  
  // Check for numbers
  if (!/\d/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất một chữ số');
  }
  
  // Check for special characters
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất một ký tự đặc biệt (@$!%*?&)');
  }
  
  // Calculate strength score (0-5)
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[@$!%*?&]/.test(password)) strength++;
  
  return {
    isValid: errors.length === 0,
    errors,
    strength, // 0-5 score
    message: errors.length === 0 
      ? 'Mật khẩu đạt yêu cầu bảo mật' 
      : errors[0] // Return first error
  };
};

module.exports = {
  validatePasswordStrength
};
