/**
 * JWT Refresh Token Middleware
 * Implements token refresh and blacklist mechanism
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');

const TOKEN_TYPE = {
  ACCESS: 'access',
  REFRESH: 'refresh'
};

/**
 * Generate a new access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      type: TOKEN_TYPE.ACCESS,
      jti: crypto.randomUUID() // Unique token ID for blacklist
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

/**
 * Generate a new refresh token (long-lived, stored in DB)
 */
const generateRefreshToken = async (user) => {
  const jti = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  // Create refresh token with short expiry for JWT verification
  const token = jwt.sign(
    {
      id: user.id,
      type: TOKEN_TYPE.REFRESH,
      jti
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  // Store refresh token in database
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, jti, expires_at, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (jti) DO NOTHING`,
    [user.id, hashToken(token), jti, expiresAt]
  );

  return token;
};

/**
 * Hash token for secure storage
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Verify token and check blacklist
 */
const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is blacklisted
    if (decoded.jti) {
      const blacklistCheck = await pool.query(
        'SELECT 1 FROM jwt_blacklist WHERE token_jti = $1',
        [decoded.jti]
      );

      if (blacklistCheck.rows.length > 0) {
        return { valid: false, reason: 'Token has been revoked' };
      }
    }

    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, reason: error.message };
  }
};

/**
 * Add token to blacklist
 */
const blacklistToken = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.jti) {
      return false;
    }

    const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date();
    const tokenHash = hashToken(token);

    await pool.query(
      `INSERT INTO jwt_blacklist (token_jti, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token_jti) DO NOTHING`,
      [decoded.jti, decoded.id, tokenHash, expiresAt]
    );

    return true;
  } catch (error) {
    console.error('Failed to blacklist token:', error);
    return false;
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify JWT structure
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== TOKEN_TYPE.REFRESH) {
      return { success: false, message: 'Invalid token type' };
    }

    // Check if refresh token exists and is valid in DB
    const tokenHash = hashToken(refreshToken);
    const tokenRecord = await pool.query(
      `SELECT rt.*, u.id as user_id, u.email, u.role, u.full_name, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.jti = $1
         AND rt.token_hash = $2
         AND rt.revoked_at IS NULL
         AND rt.expires_at > NOW()`,
      [decoded.jti, tokenHash]
    );

    if (tokenRecord.rows.length === 0) {
      return { success: false, message: 'Refresh token invalid or expired' };
    }

    const user = tokenRecord.rows[0];

    if (!user.is_active) {
      return { success: false, message: 'Account has been deactivated' };
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    return {
      success: true,
      accessToken: newAccessToken,
      expiresIn: 900 // 15 minutes in seconds
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return { success: false, message: 'Token refresh failed' };
  }
};

/**
 * Revoke all refresh tokens for a user
 */
const revokeAllUserTokens = async (userId) => {
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
};

/**
 * Revoke a specific refresh token
 */
const revokeRefreshToken = async (refreshToken) => {
  const decoded = jwt.decode(refreshToken);
  if (!decoded || !decoded.jti) {
    return false;
  }

  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE jti = $1',
    [decoded.jti]
  );

  return true;
};

/**
 * Cleanup expired/blacklisted tokens (called periodically)
 */
const cleanupExpiredTokens = async () => {
  try {
    // Remove expired blacklist entries
    const blacklistResult = await pool.query(
      'DELETE FROM jwt_blacklist WHERE expires_at < NOW() - INTERVAL \'1 day\''
    );

    // Remove expired refresh tokens
    const refreshResult = await pool.query(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at < NOW() - INTERVAL \'30 days\''
    );

    console.log(`Cleaned up ${blacklistResult.rowCount} blacklist entries and ${refreshResult.rowCount} expired refresh tokens`);
  } catch (error) {
    console.error('Token cleanup error:', error);
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  blacklistToken,
  refreshAccessToken,
  revokeAllUserTokens,
  revokeRefreshToken,
  cleanupExpiredTokens,
  TOKEN_TYPE
};
