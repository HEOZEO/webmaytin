// Test validation schemas - pure logic, không cần DB.
// Đảm bảo các edge case mà audit đã thêm vào validation được áp dụng đúng.

const v = require('../middleware/validation');

function run(middleware, body) {
  const req = { body };
  const res = {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; }
  };
  let nextCalled = false;
  middleware(req, res, () => { nextCalled = true; });
  return { statusCode: res.statusCode, body: res.body, nextCalled };
}

describe('Validation: validateRegister', () => {
  test('passes with valid input', () => {
    const r = run(v.validateRegister, {
      email: 'a@b.com',
      password: 'Pass123!',
      full_name: 'Nguyen Van A',
      phone: '0912345678'
    });
    expect(r.nextCalled).toBe(true);
  });

  test('rejects invalid email', () => {
    const r = run(v.validateRegister, {
      email: 'not-an-email',
      password: 'Pass123!',
      full_name: 'Test User',
      phone: '0912345678'
    });
    expect(r.statusCode).toBe(400);
    expect(r.body.success).toBe(false);
  });

  test('rejects short password', () => {
    const r = run(v.validateRegister, {
      email: 'a@b.com',
      password: '123',
      full_name: 'Test User',
      phone: '0912345678'
    });
    expect(r.statusCode).toBe(400);
    expect(r.body.message).toMatch(/Mật khẩu phải có ít nhất 8 ký tự/);
  });

  test('rejects bad phone', () => {
    const r = run(v.validateRegister, {
      email: 'a@b.com',
      password: 'Pass123!',
      full_name: 'Test User',
      phone: 'abc'
    });
    expect(r.statusCode).toBe(400);
  });
});

describe('Validation: validateOrder (audit H-07)', () => {
  const baseValid = {
    items: [{ product_id: 1, quantity: 2 }],
    shipping_address: '123 Đường Lê Lợi, Quận 1, TP.HCM',
    phone: '0912345678',
    payment_method: 'cod'
  };

  test('passes with valid COD order', () => {
    const r = run(v.validateOrder, baseValid);
    expect(r.nextCalled).toBe(true);
  });

  test('rejects empty items array', () => {
    const r = run(v.validateOrder, { ...baseValid, items: [] });
    expect(r.statusCode).toBe(400);
  });

  test('rejects quantity = 0', () => {
    const r = run(v.validateOrder, {
      ...baseValid, items: [{ product_id: 1, quantity: 0 }]
    });
    expect(r.statusCode).toBe(400);
  });

  test('rejects quantity > 999', () => {
    const r = run(v.validateOrder, {
      ...baseValid, items: [{ product_id: 1, quantity: 1000 }]
    });
    expect(r.statusCode).toBe(400);
  });

  test('rejects > 50 items', () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ product_id: i + 1, quantity: 1 }));
    const r = run(v.validateOrder, { ...baseValid, items });
    expect(r.statusCode).toBe(400);
  });

  test('rejects missing payment_method', () => {
    const { payment_method, ...rest } = baseValid;
    const r = run(v.validateOrder, rest);
    expect(r.statusCode).toBe(400);
  });

  test('rejects invalid payment_method', () => {
    const r = run(v.validateOrder, { ...baseValid, payment_method: 'paypal' });
    expect(r.statusCode).toBe(400);
  });

  test('rejects bad phone format', () => {
    const r = run(v.validateOrder, { ...baseValid, phone: '123' });
    expect(r.statusCode).toBe(400);
  });

  test('rejects shipping_address too short', () => {
    const r = run(v.validateOrder, { ...baseValid, shipping_address: 'abc' });
    expect(r.statusCode).toBe(400);
  });

  test('accepts coupon_code as empty string', () => {
    const r = run(v.validateOrder, { ...baseValid, coupon_code: '' });
    expect(r.nextCalled).toBe(true);
  });

  test('accepts bank_transfer payment method', () => {
    const r = run(v.validateOrder, { ...baseValid, payment_method: 'bank_transfer' });
    expect(r.nextCalled).toBe(true);
  });

  test('accepts shipping_method_id as positive integer', () => {
    const r = run(v.validateOrder, { ...baseValid, shipping_method_id: 2 });
    expect(r.nextCalled).toBe(true);
  });

  test('rejects negative product_id', () => {
    const r = run(v.validateOrder, {
      ...baseValid, items: [{ product_id: -1, quantity: 1 }]
    });
    expect(r.statusCode).toBe(400);
  });
});

describe('Validation: validateAddToCart (audit H-10)', () => {
  test('passes with positive quantity', () => {
    const r = run(v.validateAddToCart, { product_id: 1, quantity: 5 });
    expect(r.nextCalled).toBe(true);
  });

  test('rejects non-numeric product_id', () => {
    const r = run(v.validateAddToCart, { product_id: 'abc', quantity: 1 });
    expect(r.statusCode).toBe(400);
  });

  test('rejects negative product_id', () => {
    const r = run(v.validateAddToCart, { product_id: -1, quantity: 1 });
    expect(r.statusCode).toBe(400);
  });

  test('rejects quantity = 0', () => {
    const r = run(v.validateAddToCart, { product_id: 1, quantity: 0 });
    expect(r.statusCode).toBe(400);
  });

  test('rejects quantity > 999', () => {
    const r = run(v.validateAddToCart, { product_id: 1, quantity: 5000 });
    expect(r.statusCode).toBe(400);
  });
});

describe('Validation: validateCoupon', () => {
  test('passes with valid coupon', () => {
    const r = run(v.validateCoupon, { code: 'WELCOME10', order_total: 1000000 });
    expect(r.nextCalled).toBe(true);
  });

  test('rejects missing code', () => {
    const r = run(v.validateCoupon, { order_total: 1000000 });
    expect(r.statusCode).toBe(400);
  });

  test('rejects negative order_total', () => {
    const r = run(v.validateCoupon, { code: 'TEST', order_total: -1 });
    expect(r.statusCode).toBe(400);
  });
});

describe('Validation: validateReview', () => {
  test('passes with valid review', () => {
    const r = run(v.validateReview, { product_id: 1, rating: 5, comment: 'Sản phẩm rất tốt' });
    expect(r.nextCalled).toBe(true);
  });

  test('rejects rating < 1', () => {
    const r = run(v.validateReview, { product_id: 1, rating: 0, comment: 'Đủ 10 ký tự nhé' });
    expect(r.statusCode).toBe(400);
  });

  test('rejects rating > 5', () => {
    const r = run(v.validateReview, { product_id: 1, rating: 6, comment: 'Đủ 10 ký tự nhé' });
    expect(r.statusCode).toBe(400);
  });

  test('rejects short comment', () => {
    const r = run(v.validateReview, { product_id: 1, rating: 5, comment: 'ngắn' });
    expect(r.statusCode).toBe(400);
  });
});
