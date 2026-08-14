// Test cart controller - merge, add, remove, validation.
// Audit H-10: validate itemId is positive integer.

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../config/database');

const { pool } = require('../config/database');
const cartRoutes = require('../routes/cartRoutes');
const express = require('express');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    if (req.headers.authorization) {
      try {
        req.user = jwt.verify(req.headers.authorization.replace('Bearer ', ''), process.env.JWT_SECRET);
      } catch (e) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
    }
    next();
  });
  app.use('/api/cart', cartRoutes);
  return app;
}

function userToken() {
  return jwt.sign({ id: 1, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Mock the SELECT user query that `protect` middleware runs.
// In real usage, this is the first query before any controller logic.
function mockProtectQuery() {
  pool.query.mockResolvedValueOnce({
    rows: [{ id: 1, email: 'test@example.com', role: 'customer', is_active: true }]
  });
}

function mockTransaction(queryResponses) {
  let idx = 0;
  const client = {
    query: jest.fn(async (sqlOrObj) => {
      if (idx >= queryResponses.length) return { rows: [] };
      const handler = queryResponses[idx++];
      return typeof handler === 'function' ? handler(sqlOrObj) : handler;
    }),
    release: jest.fn()
  };
  pool.connect.mockResolvedValue(client);
  return client;
}

describe('Cart: POST /api/cart - addToCart', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    pool.query.mockReset();
    pool.connect.mockReset();
    mockProtectQuery();  // for `protect` middleware
  });

  test('adds new item to cart', async () => {
    const client = mockTransaction([
      { rows: [] },  // BEGIN
      { rows: [{ id: 1, name: 'Laptop', stock: 10, is_active: true, deleted_at: null }] },  // FOR UPDATE on product
      { rows: [] },  // SELECT cart → not existing
      { rows: [{ id: 1, user_id: 1, product_id: 1, quantity: 1 }] },  // INSERT
      { rows: [] }   // COMMIT
    ]);

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ product_id: 1, quantity: 1 });

    expect(res.status).toBe(201);
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  test('rejects invalid product_id', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [] }  // ROLLBACK
    ]);

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ product_id: 'abc', quantity: 1 });

    expect(res.status).toBe(400);
  });

  test('rejects quantity > 999', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [] }
    ]);

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ product_id: 1, quantity: 1500 });

    expect(res.status).toBe(400);
  });

  test('rejects quantity = 0', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [] }
    ]);

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ product_id: 1, quantity: 0 });

    expect(res.status).toBe(400);
  });

  test('returns 404 when product not found', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [] },  // FOR UPDATE returns empty
      { rows: [] }
    ]);

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ product_id: 9999, quantity: 1 });

    expect(res.status).toBe(404);
  });

  test('rejects inactive product', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [{ id: 1, name: 'X', stock: 5, is_active: false, deleted_at: null }] },
      { rows: [] }
    ]);

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ product_id: 1, quantity: 1 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/không khả dụng/i);
  });

  test('rejects when stock < quantity', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [{ id: 1, name: 'X', stock: 1, is_active: true, deleted_at: null }] },
      { rows: [] }
    ]);

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ product_id: 1, quantity: 5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Không đủ hàng/i);
  });

  test('updates existing cart item quantity (merge instead of duplicate)', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [{ id: 1, name: 'X', stock: 10, is_active: true, deleted_at: null }] },
      { rows: [{ id: 100, quantity: 2 }] },  // existing item
      { rows: [{ id: 100, quantity: 3 }] },  // UPDATE
      { rows: [] }  // COMMIT
    ]);

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ product_id: 1, quantity: 1 });  // existing 2 + new 1 = 3

    expect(res.status).toBe(200);
    // UPDATE should set quantity to 3
    const updateCall = client.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('UPDATE cart')
    );
    expect(updateCall[1][0]).toBe(3);
  });
});

describe('Cart: DELETE /api/cart/:itemId - removeFromCart (audit H-10)', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    pool.query.mockReset();
    mockProtectQuery();
  });

  test('removes item successfully', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 5 }] });

    const res = await request(app)
      .delete('/api/cart/5')
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(200);
  });

  test('rejects non-numeric itemId with 400', async () => {
    const res = await request(app)
      .delete('/api/cart/abc')
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/không hợp lệ/i);
    // Only the SELECT user (from protect middleware) should have been called;
    // the DELETE FROM cart must NOT run for invalid ID
    expect(pool.query).not.toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM cart'),
      expect.anything()
    );
  });

  test('rejects zero itemId', async () => {
    const res = await request(app)
      .delete('/api/cart/0')
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(400);
  });

  test('rejects negative itemId', async () => {
    const res = await request(app)
      .delete('/api/cart/-1')
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(400);
  });

  test('returns 404 when item not in user cart', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/cart/999')
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(404);
  });
});

describe('Cart: POST /api/cart/merge', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    pool.query.mockReset();
    pool.connect.mockReset();
    mockProtectQuery();
  });

  test('merges guest cart into user cart', async () => {
    const client = mockTransaction([
      { rows: [] },  // BEGIN
      // First item
      { rows: [{ stock: 10, is_active: true, deleted_at: null }] },  // FOR UPDATE product
      { rows: [] },  // no existing
      { rows: [] },  // INSERT
      // COMMIT
      { rows: [] }
    ]);

    const res = await request(app)
      .post('/api/cart/merge')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ items: [{ product_id: 1, quantity: 2 }] });

    expect(res.status).toBe(200);
    expect(res.body.merged).toBeGreaterThanOrEqual(1);
  });

  test('rejects non-array items', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [] }  // ROLLBACK
    ]);

    const res = await request(app)
      .post('/api/cart/merge')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ items: 'not-an-array' });

    expect(res.status).toBe(400);
  });

  test('skips invalid items silently (defensive)', async () => {
    const client = mockTransaction([
      { rows: [] },
      { rows: [] }  // COMMIT (no items processed)
    ]);

    const res = await request(app)
      .post('/api/cart/merge')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ items: [{ product_id: 'abc' }, { quantity: -1 }] });

    // Should not crash, returns 200 with merged=0
    expect(res.status).toBe(200);
    expect(res.body.merged).toBe(0);
  });

  test('caps quantity at available stock', async () => {
    const client = mockTransaction([
      { rows: [] },  // BEGIN
      { rows: [{ stock: 3, is_active: true, deleted_at: null }] },  // stock=3
      { rows: [] },  // no existing
      // INSERT with quantity = min(10, 3) = 3
      (sql) => {
        const insertCall = sql.includes('INSERT INTO cart');
        if (insertCall) {
          return { rows: [{ user_id: 1, product_id: 1, quantity: 3 }] };
        }
        return { rows: [] };
      },
      { rows: [] }  // COMMIT
    ]);

    const res = await request(app)
      .post('/api/cart/merge')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ items: [{ product_id: 1, quantity: 10 }] });

    expect(res.status).toBe(200);
    // Verify INSERT used quantity 3 (capped), not 10
    const insertCall = client.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO cart')
    );
    if (insertCall) {
      expect(insertCall[1][2]).toBe(3);  // quantity should be capped
    }
  });
});

describe('Cart: GET /api/cart', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    pool.query.mockReset();
    mockProtectQuery();
  });

  test('returns active items only (filters soft-deleted/inactive)', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, product_id: 1, name: 'Active', price: 1000, quantity: 2, is_active: true, deleted_at: null, brand_name: 'A', category_name: 'B' },
        { id: 2, product_id: 2, name: 'Discontinued', price: 2000, quantity: 1, is_active: false, deleted_at: null, brand_name: 'A', category_name: 'B' },
        { id: 3, product_id: 3, name: 'Deleted', price: 3000, quantity: 1, is_active: true, deleted_at: new Date(), brand_name: 'A', category_name: 'B' }
      ]
    });

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].name).toBe('Active');
    expect(res.body.data.total).toBe(2000);
  });
});
