// Test order controller - verify race-condition fixes (audit C-04, C-05, C-06, H-12).
// Đây là controller quan trọng nhất - mọi tiền vào/ra đều qua đây.

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../config/database');
jest.mock('../config/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'mock-id' })
}));
jest.mock('../utils/sanitizer', () => ({
  sanitizeInput: (v) => String(v || '').trim()
}));

// Mock the auth middleware to bypass DB lookup — tests inject user via JWT only.
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
const orderRoutes = require('../routes/orderRoutes');
const express = require('express');

function buildApp(userId, role = 'customer') {
  const app = express();
  app.use(express.json());
  // Bypass JWT by injecting user into req
  app.use((req, res, next) => {
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        req.user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (e) {
        return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
      }
    }
    next();
  });
  app.use('/api/orders', orderRoutes);
  return app;
}

function customerToken(userId = 1) {
  return jwt.sign({ id: userId, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function staffToken(userId = 99) {
  return jwt.sign({ id: userId, role: 'staff' }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Helper: mock a transaction with client.query function
function mockTransaction(queryResponses) {
  let idx = 0;
  const client = {
    query: jest.fn(async (sqlOrObj) => {
      const sql = typeof sqlOrObj === 'string' ? sqlOrObj : sqlOrObj.text || '';
      if (idx >= queryResponses.length) {
        return { rows: [] };
      }
      const handler = queryResponses[idx++];
      const result = typeof handler === 'function' ? handler(sql) : handler;
      return result || { rows: [] };
    }),
    release: jest.fn()
  };
  pool.connect.mockResolvedValue(client);
  return client;
}

describe('Order: POST /api/orders - createOrder', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    pool.query.mockReset();
    pool.connect.mockReset();
  });

  const validBody = {
    items: [{ product_id: 1, quantity: 2 }],
    shipping_address: '123 Lê Lợi, Quận 1, TP.HCM',
    phone: '0912345678',
    payment_method: 'cod'
  };

  test('happy path: creates order + decrements stock atomically', async () => {
    const client = mockTransaction([
      // BEGIN
      { rows: [] },
      // (no district_id / shipping_method_id → skip those queries)
      // FOR UPDATE on products
      { rows: [{ id: 1, name: 'Laptop X', price: 1000000, stock: 5, is_active: true, deleted_at: null }] },
      // (no coupon)
      // INSERT order
      { rows: [{ id: 100, total_amount: 2000000, discount_amount: 0, final_amount: 2000000 }] },
      // INSERT order_items
      { rows: [] },
      // UPDATE products stock
      { rows: [{ name: 'Laptop X', stock: 3 }] },
      // inventory_transactions (best-effort) — ignore failure
      { rows: [] },
      // INSERT payments
      { rows: [] },
      // (no coupon_usage)
      // DELETE FROM cart
      { rows: [] },
      // INSERT notification
      { rows: [] },
      // INSERT activity_log
      { rows: [] },
      // COMMIT
      { rows: [] }
    ]);

    // Mock pool.query for post-commit user lookup
    pool.query.mockResolvedValueOnce({
      rows: [{ email: 'cust@example.com', full_name: 'Test Customer' }]
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  test('rejects empty items array with 400', async () => {
    const client = mockTransaction([]);  // no queries expected (Joi rejects before controller)

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send({ ...validBody, items: [] });

    expect(res.status).toBe(400);
    // Joi validation rejects empty items first → message comes from schema
    expect(res.body.message).toMatch(/items|trống/i);
    // No DB queries should have been executed
    expect(client.query).not.toHaveBeenCalled();
  });

  test('rejects invalid payment_method with 400', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [] }
    ]);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send({ ...validBody, payment_method: 'paypal' });

    expect(res.status).toBe(400);
    // Joi validation rejects unknown payment method
    expect(res.body.message).toMatch(/payment_method|phương thức/i);
  });

  test('rejects short shipping_address', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [] }
    ]);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send({ ...validBody, shipping_address: 'abc' });

    expect(res.status).toBe(400);
  });

  test('rejects bad phone format', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [] }
    ]);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send({ ...validBody, phone: 'abc123' });

    expect(res.status).toBe(400);
  });

  test('rejects negative product_id', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [] }
    ]);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send({ ...validBody, items: [{ product_id: -1, quantity: 1 }] });

    expect(res.status).toBe(400);
  });

  test('rejects when product not found', async () => {
    const client = mockTransaction([
      { rows: [] },  // BEGIN
      // FOR UPDATE returns empty
      { rows: [] },
      { rows: [] }   // ROLLBACK
    ]);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/không tồn tại/i);
  });

  test('rejects when product is_active = false', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [{ id: 1, name: 'Discontinued', price: 1000, stock: 5, is_active: false, deleted_at: null }] },
      { rows: [] }
    ]);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/không khả dụng/i);
  });

  test('rejects when stock < requested quantity', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [{ id: 1, name: 'Laptop X', price: 1000, stock: 1, is_active: true, deleted_at: null }] },
      { rows: [] }
    ]);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send(validBody);  // quantity = 2

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/không đủ hàng/i);
  });

  test('rejects expired/exhausted coupon with rollback', async () => {
    const client = mockTransaction([
      { rows: [] },  // BEGIN
      // FOR UPDATE on products
      { rows: [{ id: 1, name: 'Laptop', price: 1000000, stock: 5, is_active: true, deleted_at: null }] },
      // Coupon SELECT FOR UPDATE: returns inactive coupon
      { rows: [{ id: 1, is_active: false }] },
      { rows: [] }   // ROLLBACK
    ]);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send({ ...validBody, coupon_code: 'EXPIRED10' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/không hợp lệ|hết hạn|hết lượt/i);
  });

  test('rollback coupon increment when min_order_amount not met', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [{ id: 1, name: 'Cheap', price: 100000, stock: 5, is_active: true, deleted_at: null }] },
      // Coupon SELECT FOR UPDATE succeeds with min_order = 500000
      { rows: [{ id: 1, discount_percent: 10, max_discount: 50000, min_order_amount: 500000, is_active: true, used_count: 0, max_uses: 10, valid_from: new Date(Date.now()-10000), valid_to: new Date(Date.now()+100000) }] },
      { rows: [] }   // ROLLBACK
    ]);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send({ ...validBody, items: [{ product_id: 1, quantity: 1 }], coupon_code: 'MIN500K' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/tối thiểu/i);
  });

  test('returns 409 when concurrent stock decrement returns 0 rows', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [{ id: 1, name: 'Laptop', price: 1000, stock: 5, is_active: true, deleted_at: null }] },
      // INSERT order
      { rows: [{ id: 100, total_amount: 2000, discount_amount: 0, final_amount: 2000 }] },
      // INSERT order_items
      { rows: [] },
      // UPDATE products stock → returns 0 (concurrent order grabbed the last one)
      { rows: [] },
      { rows: [] }
    ]);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/vừa hết hàng/i);
  });

  test('uses server-side price (ignores client price manipulation)', async () => {
    const client = mockTransaction([
      { rows: [] },
      // Server has price = 1000 (real)
      { rows: [{ id: 1, name: 'Laptop', price: 1000, stock: 100, is_active: true, deleted_at: null }] },
      { rows: [{ id: 100, total_amount: 2000, discount_amount: 0, final_amount: 2000 }] },
      { rows: [] }, { rows: [{ name: 'Laptop', stock: 98 }] }, { rows: [] },
      { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }
    ]);

    // The Joi schema doesn't include `price` so we can't pass it directly.
    // Instead, verify that the controller doesn't trust client-side price by
    // checking that INSERT INTO orders uses the server-computed total (1000*2=2000),
    // not any price field that might be in the request.
    // Here we just send quantity=2 and expect total = 2000.
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send({
        ...validBody,
        items: [{ product_id: 1, quantity: 2 }]
      });

    expect(res.status).toBe(201);
    // Verify INSERT used server price (2000, not any hypothetical client price)
    const insertCall = client.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO orders')
    );
    expect(insertCall).toBeDefined();
    // params[1] = total_amount
    expect(insertCall[1][1]).toBe(2000);
  });
});

describe('Order: PUT /api/orders/:id/cancel - cancelOrder', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    pool.query.mockReset();
    pool.connect.mockReset();
  });

  test('happy path: cancels pending order and restores stock', async () => {
    const client = mockTransaction([
      { rows: [] },  // BEGIN
      // SELECT FOR UPDATE on order
      { rows: [{ id: 50, user_id: 1, status: 'pending' }] },
      // UPDATE status
      { rows: [{ id: 50 }] },
      // SELECT order_items
      { rows: [{ product_id: 1, quantity: 2 }] },
      // SELECT FOR UPDATE on product
      { rows: [{ id: 1 }] },
      // UPDATE product stock
      { rows: [] },
      // UPDATE payments
      { rows: [] },
      // INSERT notification
      { rows: [] },
      // INSERT activity log
      { rows: [] },
      // COMMIT
      { rows: [] }
    ]);

    pool.query.mockResolvedValueOnce({
      rows: [{ email: 'cust@example.com', full_name: 'Customer' }]
    });

    const res = await request(app)
      .put('/api/orders/50/cancel')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send({ reason: 'Changed my mind' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  test('rejects order not in pending/confirmed state', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [{ id: 50, user_id: 1, status: 'shipping' }] },
      { rows: [] }  // ROLLBACK
    ]);

    const res = await request(app)
      .put('/api/orders/50/cancel')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send({ reason: 'Changed my mind' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Chờ xác nhận|Đã xác nhận/i);
  });

  test('rejects cancelling another user order (customer)', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [{ id: 50, user_id: 999, status: 'pending' }] },
      { rows: [] }
    ]);

    const res = await request(app)
      .put('/api/orders/50/cancel')
      .set('Authorization', `Bearer ${customerToken(1)}`)
      .send({ reason: 'Changed my mind' });

    expect(res.status).toBe(403);
  });

  test('returns 404 when order not found', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [] },  // empty → not found
      { rows: [] }
    ]);

    const res = await request(app)
      .put('/api/orders/9999/cancel')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send({ reason: 'Changed my mind' });

    expect(res.status).toBe(404);
  });

  test('handles concurrent cancel race (returns 409)', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [{ id: 50, user_id: 1, status: 'pending' }] },
      // UPDATE returns 0 rows (already cancelled by concurrent request)
      { rows: [] },
      { rows: [] }
    ]);

    const res = await request(app)
      .put('/api/orders/50/cancel')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send({ reason: 'Changed my mind' });

    expect(res.status).toBe(409);
  });
});

describe('Order: GET /api/orders - getOrders', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    pool.query.mockReset();
  });

  test('returns orders filtered by user for customer', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 1, total_amount: 1000, final_amount: 1000 }]
      })
      .mockResolvedValueOnce({ rows: [{ total: '1' }] });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${customerToken(5)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });

  test('returns all orders for staff (no user filter)', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ total: '2' }] });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${staffToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('Order: GET /api/orders/:id - bad id format', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });

  test('returns 400 for non-numeric id', async () => {
    const res = await request(app)
      .get('/api/orders/abc')
      .set('Authorization', `Bearer ${customerToken()}`);

    expect(res.status).toBe(400);
  });
});
