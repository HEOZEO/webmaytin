/**
 * Account lockout utility for preventing brute force attacks
 * Tracks failed login attempts and locks accounts temporarily
 *
 * NOTE: All updates use atomic SQL (UPDATE ... WHERE) to avoid race conditions
 * when multiple concurrent login attempts happen on the same account.
 */

const { pool } = require('../config/database');

const LOCKOUT_THRESHOLD = 5;          // Max failed attempts
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;  // 15 minutes in ms

/**
 * Check if account is currently locked.
 * If the lock has expired, atomically unlock and return false.
 */
const isAccountLocked = async (userId) => {
  try {
    // Atomic: auto-unlock if expired. RETURNING tells us if the row was/is locked.
    const result = await pool.query(
      `UPDATE users
       SET is_account_locked = FALSE,
           locked_until = NULL,
           failed_login_attempts = 0,
           failed_login_reset_at = NULL
       WHERE id = $1
         AND is_account_locked = TRUE
         AND locked_until IS NOT NULL
         AND locked_until <= NOW()
       RETURNING id`,
      [userId]
    );

    if (result.rows.length > 0) {
      // Was locked but we just unlocked it
      return false;
    }

    // Check if still locked
    const check = await pool.query(
      'SELECT is_account_locked, locked_until FROM users WHERE id = $1',
      [userId]
    );

    if (check.rows.length === 0) return false;
    const { is_account_locked, locked_until } = check.rows[0];

    if (!is_account_locked) return false;
    if (!locked_until) return false;
    if (new Date(locked_until) > new Date()) return true;

    // Edge case: locked_until is null but is_account_locked = true. Treat as unlocked.
    return false;
  } catch (error) {
    console.error('Error checking account lock status:', error);
    // Fail-safe: don't lock the user out due to our own error
    return false;
  }
};

/**
 * Record a failed login attempt atomically.
 * - Resets the counter if more than LOCKOUT_DURATION_MS have passed since last reset.
 * - Increments by 1.
 * - Locks the account when attempts >= LOCKOUT_THRESHOLD.
 *
 * Returns:
 *   { attempts, isLocked, lockedUntil } or null on error.
 */
const recordFailedAttempt = async (userId, ipAddress) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Read current state with FOR UPDATE to serialize concurrent attempts
    const userResult = await client.query(
      `SELECT failed_login_attempts, failed_login_reset_at, locked_until
       FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const { failed_login_attempts, failed_login_reset_at } = userResult.rows[0];
    const now = new Date();

    // Reset counter if window has elapsed or no previous reset time
    let currentAttempts = Number(failed_login_attempts || 0);
    if (!failed_login_reset_at || (now - new Date(failed_login_reset_at)) > LOCKOUT_DURATION_MS) {
      currentAttempts = 0;
    }

    currentAttempts += 1;
    const newResetTime = new Date(now.getTime() + LOCKOUT_DURATION_MS);
    const shouldLock = currentAttempts >= LOCKOUT_THRESHOLD;

    // 2. Atomic update — use explicit cast to avoid PostgreSQL type inference bug
    await client.query(
      `UPDATE users
       SET failed_login_attempts = $1,
           failed_login_reset_at = $2::timestamptz,
           is_account_locked = $3,
           locked_until = CASE WHEN $3 THEN $2::timestamptz ELSE NULL END
       WHERE id = $4`,
      [currentAttempts, newResetTime.toISOString(), shouldLock, userId]
    );

    // 3. Log attempt
    await client.query(
      `INSERT INTO login_attempts (user_id, ip_address, failed_attempt_count, last_attempt_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, ipAddress || 'unknown', currentAttempts]
    );

    await client.query('COMMIT');

    return {
      attempts: currentAttempts,
      isLocked: shouldLock,
      lockedUntil: shouldLock ? newResetTime : null
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording failed login attempt:', error);
    return null;
  } finally {
    client.release();
  }
};

/**
 * Reset failed login attempts after successful login.
 */
const resetFailedAttempts = async (userId) => {
  try {
    await pool.query(
      `UPDATE users
       SET failed_login_attempts = 0,
           failed_login_reset_at = NULL,
           is_account_locked = FALSE,
           locked_until = NULL
       WHERE id = $1`,
      [userId]
    );
    return true;
  } catch (error) {
    console.error('Error resetting failed login attempts:', error);
    return false;
  }
};

/**
 * Manually unlock an account (admin action).
 */
const unlockAccount = async (userId) => {
  try {
    await pool.query(
      `UPDATE users
       SET is_account_locked = FALSE,
           locked_until = NULL,
           failed_login_attempts = 0,
           failed_login_reset_at = NULL
       WHERE id = $1`,
      [userId]
    );
    return true;
  } catch (error) {
    console.error('Error unlocking account:', error);
    return false;
  }
};

/**
 * Get account lockout status (read-only).
 */
const getLockoutStatus = async (userId) => {
  try {
    const result = await pool.query(
      `SELECT is_account_locked, locked_until, failed_login_attempts
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) return null;

    const { is_account_locked, locked_until, failed_login_attempts } = result.rows[0];
    const remainingMs = locked_until ? new Date(locked_until) - new Date() : null;

    return {
      isLocked: !!is_account_locked && remainingMs > 0,
      lockedUntil: locked_until,
      failedAttempts: failed_login_attempts || 0,
      remainingTime: remainingMs && remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0
    };
  } catch (error) {
    console.error('Error getting lockout status:', error);
    return null;
  }
};

module.exports = {
  isAccountLocked,
  recordFailedAttempt,
  resetFailedAttempts,
  unlockAccount,
  getLockoutStatus,
  LOCKOUT_THRESHOLD,
  LOCKOUT_DURATION_MS
};
