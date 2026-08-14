// Test admin export - verifies Excel (.xlsx) generation + filter logic.

const request = require('supertest');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');

jest.mock('../config/database');

function buildApp() {
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    // Simulate the `protect` middleware: decode JWT into req.user.
    if (req.headers.authorization) {
      try {
        req.user = jwt.verify(req.headers.authorization.replace('Bearer ', ''), process.env.JWT_SECRET);
      } catch (e) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
    }
    next();
  });
  const { exportOrders } = require('../controllers/adminExportController');

  // Simulate requireAdmin: check role from req.user.
  const fakeRequireAdmin = (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'No user' });
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    next();
  };
  const fakeAuditLog = () => (req, res, next) => next();

  app.get('/api/admin/orders/export', fakeRequireAdmin, fakeAuditLog(), exportOrders);
  return app;
}

function adminToken() {
  return jwt.sign({ id: 99, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
}
function customerToken() {
  return jwt.sign({ id: 1, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('Admin: GET /api/admin/orders/export - exportOrders', () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    const { pool } = require('../config/database');
    pool.query.mockReset();
    pool.connect.mockReset();
  });

  test('returns 200 + valid Excel for admin token', async () => {
    const { pool } = require('../config/database');
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/admin/orders/export')
      .set('Authorization', `Bearer ${adminToken()}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/spreadsheetml/);
    expect(res.headers['content-disposition']).toMatch(/don-hang-.*\.xlsx/);

    const wb = XLSX.read(res.body, { type: 'buffer' });
    expect(wb.SheetNames).toContain('Orders');
    expect(wb.SheetNames).toContain('Summary');
  });

  test('includes order data with Vietnamese columns', async () => {
    const { pool } = require('../config/database');
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 555,
        created_at: new Date('2026-08-04T10:30:00Z'),
        status: 'pending',
        total_amount: 5000000,
        discount_amount: 500000,
        shipping_fee: 30000,
        final_amount: 4530000,
        payment_method: 'cod',
        shipping_address: '123 Le Loi, Q1, HCM',
        phone: '0912345678',
        customer_email: 'khach@example.com',
        customer_name: 'Nguyen Van A',
        customer_phone: '0987654321',
        item_count: 2,
        items_summary: 'Laptop (x1); Mouse (x1)'
      }]
    });

    const res = await request(app)
      .get('/api/admin/orders/export')
      .set('Authorization', `Bearer ${adminToken()}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    const wb = XLSX.read(res.body, { type: 'buffer' });
    const data = XLSX.utils.sheet_to_json(wb.Sheets['Orders']);

    expect(data).toHaveLength(1);
    expect(data[0]['Mã đơn']).toBe(555);
    expect(data[0]['Khách hàng']).toBe('Nguyen Van A');
    expect(data[0]['Tổng tiền (đ)']).toBe(5000000);
    expect(data[0]['Trạng thái']).toBe('Chờ xác nhận');
  });

  test('uses Vietnamese headers and date format', async () => {
    const { pool } = require('../config/database');
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 1, created_at: new Date('2026-08-04T03:00:00Z'),
        status: 'shipping', total_amount: 1000000, discount_amount: 0,
        shipping_fee: 0, final_amount: 1000000, payment_method: 'bank_transfer',
        shipping_address: '', phone: '', customer_email: 'a@b.com',
        customer_name: 'A', customer_phone: '', item_count: 1, items_summary: 'SP1'
      }]
    });

    const res = await request(app)
      .get('/api/admin/orders/export')
      .set('Authorization', `Bearer ${adminToken()}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    const wb = XLSX.read(res.body, { type: 'buffer' });
    const data = XLSX.utils.sheet_to_json(wb.Sheets['Orders']);
    expect(data[0]['Trạng thái']).toBe('Đang giao');
    expect(data[0]['Thanh toán']).toBe('Chuyển khoản');
    expect(data[0]['Ngày tạo']).toMatch(/2026/);
  });

  test('returns 403 for non-admin user', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export')
      .set('Authorization', `Bearer ${customerToken()}`);

    expect(res.status).toBe(403);
  });

  test('returns 401 without token', async () => {
    const res = await request(app)
      .get('/api/admin/orders/export');

    expect(res.status).toBe(401);
  });

  test('accepts filters via query params', async () => {
    const { pool } = require('../config/database');
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/admin/orders/export?status=shipping&fromDate=2026-08-01&toDate=2026-08-31&customerId=42')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);

    const calls = pool.query.mock.calls.filter(c => {
      const sql = typeof c[0] === 'string' ? c[0] : (c[0]?.text || '');
      return sql.includes('FROM orders o');
    });
    expect(calls.length).toBeGreaterThan(0);
    const arg = calls[0][0];
    const sqlText = typeof arg === 'string' ? arg : arg.text;
    expect(sqlText).toMatch(/LOWER\(o\.status\)/);
    expect(sqlText).toMatch(/o\.user_id/);
    expect(sqlText).toMatch(/o\.created_at >=/);
    expect(sqlText).toMatch(/o\.created_at <=/);
    // 4 filter params
    expect(calls[0][1]).toHaveLength(4);
  });

  test('returns empty sheet with summary when no orders match', async () => {
    const { pool } = require('../config/database');
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/admin/orders/export')
      .set('Authorization', `Bearer ${adminToken()}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    const wb = XLSX.read(res.body, { type: 'buffer' });
    const data = XLSX.utils.sheet_to_json(wb.Sheets['Orders']);
    expect(data).toHaveLength(0);

    // Summary sheet should exist
    expect(wb.Sheets['Summary']).toBeDefined();
  });
});
