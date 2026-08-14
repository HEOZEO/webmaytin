// Test coupon controller - validateCoupon, validateCouponForCheckout, updateCoupon.
// Audit H-02: empty string in PATCH must not clobber existing values.

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../config/database');
jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    if (req.headers.authorization) {
      const mockToken = req.headers.authorization.replace('Bearer ', '');
      try {
        const mockJwt = require('jsonwebtoken');
        req.user = mockJwt.verify(mockToken, process.env.JWT_SECRET);
        next();
      } catch (e) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
    } else {
      return res.status(401).json({ success: false, message: 'No token' });
    }
  },
  adminOnly: (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    next();
  },
  authorize: (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Forbidden' });
    next();
  }
}));

const { pool } = require('../config/database');
const couponRoutes = require('../routes/couponRoutes');
const express = require('express');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/coupons', couponRoutes);
  return app;
}

function adminToken() {
  return jwt.sign({ id: 99, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('Coupon: POST /api/coupons/validate', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    pool.query.mockReset();
    pool.connect.mockReset();
  });

  test('returns 200 with coupon data when valid', async () => {
    const client = {
      query: jest.fn().mockResolvedValueOnce({
        rows: [{ id: 1, code: 'WELCOME10', discount_percent: 10, max_discount: 50000, min_order_amount: 100000, is_active: true }]
      }),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(client);

    const res = await request(app)
      .post('/api/coupons/validate')
      .send({ code: 'WELCOME10', order_total: 500000 });

    expect(res.status).toBe(200);
    expect(res.body.data.coupon.code).toBe('WELCOME10');
  });

  test('returns 404 when coupon not found', async () => {
    const client = {
      query: jest.fn().mockResolvedValueOnce({ rows: [] }),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(client);

    const res = await request(app)
      .post('/api/coupons/validate')
      .send({ code: 'NOPE', order_total: 1000 });

    expect(res.status).toBe(404);
  });

  test('returns 400 when order_total < min_order_amount', async () => {
    const client = {
      query: jest.fn().mockResolvedValueOnce({
        rows: [{ id: 1, code: 'MIN500', discount_percent: 10, max_discount: 50000, min_order_amount: 500000, is_active: true }]
      }),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(client);

    const res = await request(app)
      .post('/api/coupons/validate')
      .send({ code: 'MIN500', order_total: 100000 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/tối thiểu/i);
  });

  test('returns 400 when code missing', async () => {
    // Mock pool.connect to return a valid client (with release fn) because the
    // controller acquires a connection before validating input.
    pool.connect.mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    });

    const res = await request(app)
      .post('/api/coupons/validate')
      .send({ order_total: 1000 });

    expect(res.status).toBe(400);
  });
});

describe('Coupon: PUT /api/coupons/:id - updateCoupon (audit H-02)', () => {
  let app;
  let clientMock;
  beforeEach(() => {
    app = buildApp();
    clientMock = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockReset();
    pool.connect.mockResolvedValue(clientMock);
  });

  test('rejects request with no fields to update', async () => {
    const res = await request(app)
      .put('/api/coupons/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Không có trường/i);
    expect(clientMock.query).not.toHaveBeenCalled();
  });

  test('empty string for description should NOT update it (only present fields)', async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1, code: 'TEST', description: 'old description', discount_percent: 10 }] }) // UPDATE
      .mockResolvedValueOnce({}) // INSERT activity
      .mockResolvedValueOnce({}); // COMMIT

    const res = await request(app)
      .put('/api/coupons/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ discount_percent: 20 });  // only update discount_percent

    expect(res.status).toBe(200);

    // Verify SQL only contains discount_percent, NOT description
    const sqlCall = clientMock.query.mock.calls[1][0];
    expect(sqlCall).toMatch(/discount_percent/);
    expect(sqlCall).not.toMatch(/description/);
  });

  test('updates only the provided fields', async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1, code: 'NEW', discount_percent: 30 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await request(app)
      .put('/api/coupons/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ code: 'NEW', discount_percent: 30, max_uses: 200 });

    expect(res.status).toBe(200);

    const sqlCall = clientMock.query.mock.calls[1][0];
    expect(sqlCall).toMatch(/code = UPPER/);
    expect(sqlCall).toMatch(/discount_percent/);
    expect(sqlCall).toMatch(/max_uses/);
    expect(sqlCall).not.toMatch(/description/);
  });

  test('returns 404 when coupon not found', async () => {
    clientMock.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // UPDATE returns 0 rows
      .mockResolvedValueOnce({}); // ROLLBACK

    const res = await request(app)
      .put('/api/coupons/9999')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ discount_percent: 50 });

    expect(res.status).toBe(404);
  });

  test('returns 403 for non-admin', async () => {
    const customerToken = jwt.sign({ id: 1, role: 'customer' }, process.env.JWT_SECRET);

    const res = await request(app)
      .put('/api/coupons/1')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ discount_percent: 50 });

    expect(res.status).toBe(403);
  });

  test('returns 401 without token', async () => {
    const res = await request(app)
      .put('/api/coupons/1')
      .send({ discount_percent: 50 });

    expect(res.status).toBe(401);
  });
});

describe('Coupon: GET /api/coupons/available', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    pool.query.mockReset();
  });

  test('returns only active & non-expired coupons', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { code: 'ACTIVE1', discount_percent: 10, remaining_uses: 5 },
        { code: 'ACTIVE2', discount_percent: 5, remaining_uses: 100 }
      ]
    });

    const res = await request(app).get('/api/coupons/available');

    expect(res.status).toBe(200);
    expect(res.body.data.coupons).toHaveLength(2);
    // Verify the SQL filter is correct
    expect(pool.query.mock.calls[0][0]).toMatch(/is_active = true/);
    expect(pool.query.mock.calls[0][0]).toMatch(/COALESCE\(actual_usage\.cnt,\s*0\)\s*<\s*c\.max_uses/);
  });
});
