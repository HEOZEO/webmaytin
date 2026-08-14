/**
 * Idempotency Middleware for Order Creation
 * Prevents duplicate order creation when client retries after timeout
 *
 * How it works:
 * 1. Client sends X-Idempotency-Key header with unique UUID
 * 2. Server checks if key exists in idempotency_keys table
 * 3. If exists: return cached response (order that was created)
 * 4. If not: process request, store result with key, return response
 * 5. Keys expire after 24 hours
 */

const { pool } = require('../config/database');

const IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key';
const IDEMPOTENCY_TTL_HOURS = 24;

/**
 * Create idempotency middleware
 * @param {Object} options - Configuration options
 * @param {string} options.keyHeader - Header name for idempotency key (default: x-idempotency-key)
 * @param {number} options.ttlHours - Hours until key expires (default: 24)
 * @param {string} options.tableName - Table name for idempotency records (default: idempotency_keys)
 * @returns {Function} Express middleware
 */
const idempotencyMiddleware = (options = {}) => {
  const {
    keyHeader = IDEMPOTENCY_KEY_HEADER,
    ttlHours = IDEMPOTENCY_TTL_HOURS,
    tableName = 'idempotency_keys'
  } = options;

  // Validate UUID v4 format
  const isValidUUID = (key) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(key);
  };

  return async (req, res, next) => {
    // Only apply to POST requests
    if (req.method !== 'POST') {
      return next();
    }

    const idempotencyKey = req.headers[keyHeader.toLowerCase()];

    // If no key provided, continue without idempotency (will create new order)
    if (!idempotencyKey) {
      return next();
    }

    // Validate key format
    if (!isValidUUID(idempotencyKey)) {
      return res.status(400).json({
        success: false,
        message: 'Idempotency key phải là UUID v4 hợp lệ',
        code: 'INVALID_IDEMPOTENCY_KEY'
      });
    }

    try {
      // Check if this key already exists
      const checkResult = await pool.query(
        `SELECT id, response_data, response_status, created_at
         FROM ${tableName}
         WHERE idempotency_key = $1
           AND created_at > NOW() - INTERVAL '${ttlHours} hours'
         LIMIT 1`,
        [idempotencyKey]
      );

      if (checkResult.rows.length > 0) {
        // Key exists - return cached response
        const cached = checkResult.rows[0];

        console.log(`Idempotency hit: ${idempotencyKey} -> returning cached response`);

        // Update last accessed time
        await pool.query(
          `UPDATE ${tableName} SET last_accessed = NOW() WHERE id = $1`,
          [cached.id]
        );

        // Parse and return cached response
        const cachedResponse = typeof cached.response_data === 'string'
          ? JSON.parse(cached.response_data)
          : cached.response_data;

        return res.status(cached.response_status).json(cachedResponse);
      }

      // Key doesn't exist - create entry and continue
      // Store key with null response first (in-progress state)
      await pool.query(
        `INSERT INTO ${tableName} (idempotency_key, created_at, last_accessed)
         VALUES ($1, NOW(), NOW())
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [idempotencyKey]
      );

      // Override res.json to capture and store the response
      const originalJson = res.json.bind(res);
      let responseCaptured = false;

      res.json = async (data) => {
        // Only capture for 2xx responses
        if (responseCaptured || res.statusCode < 200 || res.statusCode >= 300) {
          return originalJson(data);
        }

        responseCaptured = true;

        try {
          // Store the response
          await pool.query(
            `UPDATE ${tableName}
             SET response_data = $1,
                 response_status = $2,
                 completed_at = NOW(),
                 last_accessed = NOW()
             WHERE idempotency_key = $3`,
            [JSON.stringify(data), res.statusCode, idempotencyKey]
          );
        } catch (storeError) {
          console.error('Failed to store idempotency response:', storeError);
          // Don't fail the request if storage fails
        }

        return originalJson(data);
      };

      // Add cleanup method if needed
      req.idempotencyKey = idempotencyKey;
      next();

    } catch (error) {
      console.error('Idempotency middleware error:', error);
      // On error, continue without idempotency (fail open for availability)
      next();
    }
  };
};

/**
 * Cleanup expired idempotency keys
 * Should be called periodically (e.g., every hour)
 */
const cleanupExpiredKeys = async (tableName = 'idempotency_keys') => {
  try {
    const result = await pool.query(
      `DELETE FROM ${tableName}
       WHERE created_at < NOW() - INTERVAL '${IDEMPOTENCY_TTL_HOURS} hours'
         AND completed_at IS NOT NULL
       RETURNING id`
    );

    console.log(`Cleaned up ${result.rowCount} expired idempotency keys`);
    return result.rowCount;
  } catch (error) {
    console.error('Failed to cleanup idempotency keys:', error);
    throw error;
  }
};

module.exports = {
  idempotencyMiddleware,
  cleanupExpiredKeys,
  IDEMPOTENCY_KEY_HEADER
};
