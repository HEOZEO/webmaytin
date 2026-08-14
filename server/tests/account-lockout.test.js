// Test account lockout - verify race-condition fixes (audit H-12).
// Mục tiêu: đảm bảo việc đếm failed attempt là atomic và lock sau đúng threshold.

const { pool } = require('../config/database');
const lockout = require('../utils/accountLockout');

// Helper to mock a transaction's client.query from a list of responses
function makeClient(responses) {
  let idx = 0;
  const client = {
    query: jest.fn(async (sqlOrObj) => {
      if (idx >= responses.length) return { rows: [] };
      const handler = responses[idx++];
      return typeof handler === 'function' ? handler(sqlOrObj) : handler;
    }),
    release: jest.fn()
  };
  pool.connect.mockResolvedValue(client);
  return client;
}

describe('Account Lockout - Atomic Operations', () => {
  beforeEach(() => {
    pool.query.mockReset();
    pool.connect.mockReset();
  });

  describe('recordFailedAttempt', () => {
    test('returns null when user not found', async () => {
      const client = makeClient([
        { rows: [] }  // SELECT FOR UPDATE returns 0
      ]);

      const result = await lockout.recordFailedAttempt(999, '127.0.0.1');
      expect(result).toBeNull();
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('increments attempts from 0 to 1 (does not lock)', async () => {
      const client = makeClient([
        // BEGIN
        { rows: [] },
        // SELECT FOR UPDATE
        { rows: [{ failed_login_attempts: 0, failed_login_reset_at: null, locked_until: null }] },
        // UPDATE users
        { rows: [] },
        // INSERT login_attempts
        { rows: [] },
        // COMMIT
        { rows: [] }
      ]);

      const result = await lockout.recordFailedAttempt(1, '127.0.0.1');

      expect(result.attempts).toBe(1);
      expect(result.isLocked).toBe(false);
      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.query.mock.calls.length).toBeGreaterThanOrEqual(5); // BEGIN, SELECT, UPDATE, INSERT, COMMIT
      expect(client.release).toHaveBeenCalled();
    });

    test('resets counter when window elapsed', async () => {
      const oldResetTime = new Date(Date.now() - 20 * 60 * 1000); // 20 min ago (> 15 min window)
      const client = makeClient([
        { rows: [] },
        { rows: [{ failed_login_attempts: 4, failed_login_reset_at: oldResetTime, locked_until: null }] },
        { rows: [] },
        { rows: [] },
        { rows: [] }
      ]);

      const result = await lockout.recordFailedAttempt(1, '127.0.0.1');

      // Window elapsed → reset to 0, then +1 = 1
      expect(result.attempts).toBe(1);
      expect(result.isLocked).toBe(false);
    });

    test('locks account on 5th attempt', async () => {
      const recentReset = new Date(Date.now() - 60 * 1000); // 1 min ago
      const client = makeClient([
        { rows: [] },
        { rows: [{ failed_login_attempts: 4, failed_login_reset_at: recentReset, locked_until: null }] },
        { rows: [] },
        { rows: [] },
        { rows: [] }
      ]);

      const result = await lockout.recordFailedAttempt(1, '127.0.0.1');

      expect(result.attempts).toBe(5);
      expect(result.isLocked).toBe(true);
      expect(result.lockedUntil).toBeInstanceOf(Date);
    });

    test('continues counting when within window', async () => {
      const recentReset = new Date(Date.now() - 60 * 1000);
      const client = makeClient([
        { rows: [] },
        { rows: [{ failed_login_attempts: 2, failed_login_reset_at: recentReset, locked_until: null }] },
        { rows: [] },
        { rows: [] },
        { rows: [] }
      ]);

      const result = await lockout.recordFailedAttempt(1, '127.0.0.1');

      expect(result.attempts).toBe(3);
      expect(result.isLocked).toBe(false);
    });

    test('rolls back on error', async () => {
      const client = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] })  // BEGIN
          .mockResolvedValueOnce({
            rows: [{ failed_login_attempts: 1, failed_login_reset_at: null, locked_until: null }]
          })
          .mockRejectedValueOnce(new Error('DB error')),
        release: jest.fn()
      };
      pool.connect.mockResolvedValue(client);

      const result = await lockout.recordFailedAttempt(1, '127.0.0.1');

      expect(result).toBeNull();
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalled();
    });

    test('releases client even on success', async () => {
      const client = makeClient([
        { rows: [] },
        { rows: [{ failed_login_attempts: 0, failed_login_reset_at: null, locked_until: null }] },
        { rows: [] },
        { rows: [] },
        { rows: [] }
      ]);

      await lockout.recordFailedAttempt(1, '127.0.0.1');
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('isAccountLocked', () => {
    test('auto-unlocks expired lock and returns false', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const locked = await lockout.isAccountLocked(1);
      expect(locked).toBe(false);
    });

    test('returns false when not locked', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ is_account_locked: false, locked_until: null }] });
      const locked = await lockout.isAccountLocked(1);
      expect(locked).toBe(false);
    });

    test('returns true when locked_until is in the future', async () => {
      const future = new Date(Date.now() + 5 * 60 * 1000);
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ is_account_locked: true, locked_until: future }] });
      const locked = await lockout.isAccountLocked(1);
      expect(locked).toBe(true);
    });

    test('returns false on DB error (fail-safe)', async () => {
      pool.query.mockRejectedValue(new Error('DB down'));
      const locked = await lockout.isAccountLocked(1);
      expect(locked).toBe(false);
    });
  });

  describe('resetFailedAttempts', () => {
    test('clears all lockout fields', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      await lockout.resetFailedAttempts(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('failed_login_attempts = 0'),
        [1]
      );
    });
  });

  describe('constants', () => {
    test('LOCKOUT_THRESHOLD = 5', () => {
      expect(lockout.LOCKOUT_THRESHOLD).toBe(5);
    });
    test('LOCKOUT_DURATION_MS = 15 minutes', () => {
      expect(lockout.LOCKOUT_DURATION_MS).toBe(15 * 60 * 1000);
    });
  });
});
