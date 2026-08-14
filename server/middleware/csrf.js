/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern for stateless CSRF protection
 * Works without sessions - suitable for JWT-based authentication
 */

const crypto = require('crypto');

const CSRF_COOKIE_NAME = '_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32; // 256 bits

/**
 * Generate a new CSRF token
 * @returns {string} Random hex token
 */
const generateToken = () => {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
};

/**
 * Create a signed CSRF token
 * Token includes a secret that's known only to the server
 * @param {string} secret - Application secret or user-specific secret
 * @returns {string} Signed token
 */
const createSignedToken = (secret) => {
  const token = generateToken();
  const signature = crypto
    .createHmac('sha256', secret || process.env.JWT_SECRET || 'csrf-default-secret')
    .update(token)
    .digest('hex');

  // Return token.signature format for verification
  return `${token}.${signature}`;
};

/**
 * Verify a signed CSRF token
 * @param {string} signedToken - The token to verify
 * @param {string} secret - Secret used for signing
 * @returns {boolean} True if valid
 */
const verifySignedToken = (signedToken, secret) => {
  if (!signedToken || typeof signedToken !== 'string') {
    return false;
  }

  const parts = signedToken.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const [token, receivedSignature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', secret || process.env.JWT_SECRET || 'csrf-default-secret')
    .update(token)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
};

/**
 * Generate and attach CSRF token to request
 * Creates a new token if none exists or if token is invalid
 */
const generateCsrfToken = (req, res, next) => {
  // FIX: Dùng JWT_SECRET cố định làm secret (KHÔNG phụ thuộc user_id)
  // Trước đây: secret = `${user_id}-${JWT_SECRET}` → token bị ký lại với secret khác
  // sau khi user login → client có token cũ (secret JWT_SECRET) nhưng server verify
  // bằng secret mới (user_id-JWT_SECRET) → CSRF_INVALID 403
  const secret = process.env.JWT_SECRET;

  // Check if client sent a token (for verification)
  const clientToken = req.headers[CSRF_HEADER_NAME] || req.body?._csrf;

  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    // Safe methods: không verify, không tạo. Để route tự xử lý.
    return next();
  }

  // For unsafe methods (POST, PUT, DELETE, PATCH), verify token
  console.log(`[CSRF] ${req.method} ${req.path} | user_id=${req.user?.id || 'none'} | has_client_token=${!!clientToken}`);

  if (!clientToken) {
    return res.status(403).json({
      success: false,
      message: 'Thiếu CSRF token. Vui lòng tải lại trang và thử lại.',
      code: 'CSRF_MISSING'
    });
  }

  const isValid = verifySignedToken(clientToken, secret);

  if (!isValid) {
    console.log(`[CSRF] INVALID token for ${req.method} ${req.path} (user=${req.user?.id})`);
    return res.status(403).json({
      success: false,
      message: 'CSRF token không hợp lệ. Vui lòng tải lại trang và thử lại.',
      code: 'CSRF_INVALID'
    });
  }

  console.log(`[CSRF] OK ${req.method} ${req.path}`);

  // Generate new token for next request (token rotation)
  req.csrfToken = createSignedToken(secret);
  res.cookie(CSRF_COOKIE_NAME, req.csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  });
  // Expose token via response header so JS can read (cookie is httpOnly)
  res.setHeader(CSRF_HEADER_NAME, req.csrfToken);

  next();
};

/**
 * Middleware to verify CSRF token for unsafe methods
 * Safe methods (GET, HEAD, OPTIONS) are skipped
 */
const verifyCsrfToken = (req, res, next) => {
  // Skip safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip paths that don't require CSRF (API health checks, etc.)
  const skipPaths = ['/api/health', '/api/test-db'];
  if (skipPaths.includes(req.path)) {
    return next();
  }

  return generateCsrfToken(req, res, next);
};

/**
 * Optional CSRF verification - doesn't block if token is missing
 * Useful for gradual rollout
 */
const optionalCsrfToken = (req, res, next) => {
  // Skip safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const clientToken = req.headers[CSRF_HEADER_NAME] || req.body?._csrf;

  // If no token provided, just log warning and continue
  if (!clientToken) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`CSRF warning: No token for ${req.method} ${req.path} from ${req.ip}`);
    }
    return next();
  }

  return generateCsrfToken(req, res, next);
};

module.exports = {
  generateToken,
  createSignedToken,
  verifySignedToken,
  generateCsrfToken,
  verifyCsrfToken,
  optionalCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME
};
