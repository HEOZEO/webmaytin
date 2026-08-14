// Test auth controller: register, login, OTP, forgot/reset password.
// Audit liên quan: C-02 (OTP), H-12 (lockout), C-08 (soft-delete).

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock pg pool & account lockout & email BEFORE loading app
jest.mock('../config/database');
jest.mock('../config/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-id' })
}));
jest.mock('../utils/accountLockout', () => ({
  isAccountLocked: jest.fn().mockResolvedValue(false),
  recordFailedAttempt: jest.fn().mockResolvedValue({ isLocked: false, attempts: 1 }),
  resetFailedAttempts: jest.fn().mockResolvedValue(true),
  getLockoutStatus: jest.fn().mockResolvedValue({ isLocked: false, remainingTime: 0 }),
  unlockAccount: jest.fn().mockResolvedValue(true)
}));

// Mock express-rate-limit to be a no-op pass-through for tests
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

// Mock auth middleware to bypass DB lookup
jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ success: false, message: 'No token' });
    }
    try {
      const mockJwt = require('jsonwebtoken');
      const mockDecoded = mockJwt.verify(req.headers.authorization.replace('Bearer ', ''), process.env.JWT_SECRET);
      req.user = { id: mockDecoded.id, role: mockDecoded.role, email: 'test@example.com', is_active: true };
      next();
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  },
  authorize: (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  },
  adminOnly: (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    next();
  }
}));

const { pool } = require('../config/database');
const { isAccountLocked, recordFailedAttempt } = require('../utils/accountLockout');
const authApp = require('../routes/authRoutes');
const express = require('express');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authApp);
  return app;
}

function makeUser(overrides = {}) {
  return {
    id: 1,
    email: 'user@example.com',
    username: 'user',
    password: bcrypt.hashSync('Pass123!', 4),
    full_name: 'Test User',
    role: 'customer',
    phone: '0912345678',
    address: '',
    is_active: true,
    is_account_locked: false,
    locked_until: null,
    failed_login_attempts: 0,
    ...overrides
  };
}

describe('Auth: POST /api/auth/register', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  test('register success returns token + user', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })  // check existing
      .mockResolvedValueOnce({
        rows: [{ id: 1, email: 'new@example.com', full_name: 'New', role: 'customer' }]
      })
      .mockResolvedValueOnce({ rows: [] });  // activity log

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'Pass123!', full_name: 'New User', phone: '0912345678' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('new@example.com');
  });

  test('register duplicate email returns 400', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'Pass123!', full_name: 'Dup User', phone: '0912345678' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/đã được sử dụng/i);
  });

  test('register invalid email returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-email', password: 'Pass123!', full_name: 'X', phone: '0912345678' });

    expect(res.status).toBe(400);
  });
});

describe('Auth: POST /api/auth/login', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  test('login success returns token', async () => {
    const user = makeUser();
    pool.query.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'Pass123!' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('user@example.com');
  });

  test('login wrong password returns 401', async () => {
    const user = makeUser();
    pool.query.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'WrongPass!' });

    expect(res.status).toBe(401);
    expect(recordFailedAttempt).toHaveBeenCalledWith(user.id, expect.any(String));
  });

  test('login non-existent user returns 401', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'any' });

    expect(res.status).toBe(401);
  });

  test('login locked account returns 423', async () => {
    const user = makeUser();
    pool.query.mockResolvedValueOnce({ rows: [user] });
    isAccountLocked.mockResolvedValueOnce(true);
    const { getLockoutStatus } = require('../utils/accountLockout');
    getLockoutStatus.mockResolvedValueOnce({ remainingTime: 600, isLocked: true });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'Pass123!' });

    expect(res.status).toBe(423);
    expect(res.body.locked).toBe(true);
  });

  test('login missing credentials returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
  });

  test('login by username also works', async () => {
    const user = makeUser();
    pool.query.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user', password: 'Pass123!' });  // no '@' → treated as username

    expect(res.status).toBe(200);
  });
});

describe('Auth: /api/auth/me', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  test('no token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('valid token returns user', async () => {
    const user = makeUser();
    pool.query.mockResolvedValueOnce({ rows: [user] });

    const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(1);
  });

  test('invalid token returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
  });
});

describe('Auth: OTP (audit C-02)', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  test('POST /send-otp triggers registration OTP', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })  // delete old OTPs
      .mockResolvedValueOnce({ rows: [] });  // insert new OTP

    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ email: 'new@example.com', full_name: 'New User' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/xác thực|OTP|verification/i);

    // Verify the OTP inserted is a 6-digit hashed value, NOT plaintext Math.random output
    const insertCall = pool.query.mock.calls.find(c => {
      const sql = typeof c[0] === 'string' ? c[0] : (c[0] && c[0].text) || '';
      return sql.includes('INSERT INTO otp_codes');
    });
    expect(insertCall).toBeDefined();
    // The second parameter should be an array; the hashed OTP is 64 hex chars (SHA-256)
    const params = insertCall[1];
    expect(params).toBeDefined();
    expect(params.some(p => typeof p === 'string' && /^[a-f0-9]{64}$/.test(p))).toBe(true);
  });

  test('POST /verify-otp with valid code creates user', async () => {
    const crypto = require('crypto');
    const otp = '123456';
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // verifyRegisterOTP uses pool.connect().query() inside a transaction.
    let qIdx = 0;
    const client = {
      query: jest.fn(async () => {
        const responses = [
          { rows: [] },                                          // BEGIN
          { rows: [{ id: 1, email: 'new@example.com', otp_code: hashedOtp, verified: false, attempts: 0, expires_at: new Date(Date.now() + 60000) }] }, // SELECT FOR UPDATE otp
          { rows: [{ id: 1 }] },                                 // verifyUpdate → verified=TRUE
          { rows: [] },                                          // SELECT users WHERE email (race check)
          { rows: [] },                                          // SELECT username check (not exists → break)
          { rows: [{ id: 10, email: 'new@example.com', username: 'new', full_name: 'New User', role: 'customer' }] }, // INSERT user
          { rows: [] },                                          // activity log
          { rows: [] }                                           // COMMIT
        ];
        return responses[qIdx++] || { rows: [] };
      }),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(client);

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: 'new@example.com',
        otp,
        password: 'Pass123!',
        full_name: 'New User',
        phone: '0912345678'
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('new@example.com');
  });

  test('POST /verify-otp with wrong code returns 400', async () => {
    const crypto = require('crypto');
    const hashedOtp = crypto.createHash('sha256').update('999999').digest('hex');

    let qIdx = 0;
    const client = {
      query: jest.fn(async () => {
        const responses = [
          { rows: [] },                                          // BEGIN
          { rows: [] },                                          // SELECT FOR UPDATE (no match — wrong code)
          { rows: [{ id: 1, verified: false, expires_at: new Date(Date.now() + 60000), attempts: 0 }] }, // SELECT any otp
          { rows: [{ attempts: 1 }] },                           // UPDATE attempts
          { rows: [] }                                           // COMMIT
        ];
        return responses[qIdx++] || { rows: [] };
      }),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(client);

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: 'a@b.com',
        otp: '111111',
        password: 'Pass123!',
        full_name: 'New'
      });

    expect(res.status).toBe(400);
  });
});

describe('Auth: Forgot / Reset password', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  test('forgot-password always returns 200 (no email enumeration)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });  // user not found OR no error

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'noone@example.com' });

    // Should not leak whether email exists
    expect(res.status).toBe(200);
  });

  test('reset-password with bad token returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'invalid', new_password: 'NewPass123!' });

    expect(res.status).toBe(400);
  });
});
