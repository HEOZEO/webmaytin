// Unit tests for email templates — verify HTML structure, escaping, totals.

const { orderConfirmation, orderStatusUpdate } = require('../templates/emailTemplates');

describe('emailTemplates', () => {
  describe('orderConfirmation', () => {
    const baseOrder = {
      id: 12345,
      total_amount: 5000000,
      discount_amount: 500000,
      final_amount: 4500000,
      shipping_address: '123 Nguyễn Huệ, Q1, TP.HCM',
      payment_method: 'cod'
    };
    const baseItems = [
      { name: 'Laptop Dell XPS 13', quantity: 1, price: 3000000 },
      { name: 'Chuột Logitech MX', quantity: 2, price: 1000000 }
    ];
    const baseUser = { email: 'khach@example.com', full_name: 'Nguyễn Văn A' };

    test('renders valid HTML with order number', () => {
      const html = orderConfirmation(baseOrder, baseItems, baseUser);
      expect(html).toMatch(/^<!doctype html>/i);
      expect(html).toContain('Nguyễn Văn A');
      expect(html).toContain('#12345');
    });

    test('contains all product names', () => {
      const html = orderConfirmation(baseOrder, baseItems, baseUser);
      expect(html).toContain('Laptop Dell XPS 13');
      expect(html).toContain('Chuột Logitech MX');
    });

    test('formats prices with Vietnamese đ symbol', () => {
      const html = orderConfirmation(baseOrder, baseItems, baseUser);
      expect(html).toMatch(/5\.000\.000đ|5,000,000đ/);
      expect(html).toMatch(/4\.500\.000đ|4,500,000đ/);
      expect(html).toMatch(/3\.000\.000đ|3,000,000đ/);
    });

    test('shows discount row when discount > 0', () => {
      const html = orderConfirmation(baseOrder, baseItems, baseUser);
      expect(html).toContain('Giảm giá');
      expect(html).toMatch(/500\.000đ|500,000đ/);
    });

    test('hides discount row when discount = 0', () => {
      const html = orderConfirmation({ ...baseOrder, discount_amount: 0 }, baseItems, baseUser);
      expect(html).not.toContain('Giảm giá:');
    });

    test('escapes malicious product name', () => {
      const evil = [
        { name: '<script>alert("xss")</script>', quantity: 1, price: 1000 }
      ];
      const html = orderConfirmation(baseOrder, evil, baseUser);
      expect(html).not.toContain('<script>alert("xss")</script>');
      // Properly escaped form should be present
      expect(html).toMatch(/&lt;script&gt;/);
    });

    test('handles missing user full_name gracefully', () => {
      const html = orderConfirmation(baseOrder, baseItems, { email: 'x@x.com' });
      expect(html).toContain('bạn');
    });

    test('renders COD payment label', () => {
      const html = orderConfirmation({ ...baseOrder, payment_method: 'cod' }, baseItems, baseUser);
      expect(html).toContain('Thanh toán khi nhận hàng');
    });

    test('renders BANK_TRANSFER payment label', () => {
      const html = orderConfirmation({ ...baseOrder, payment_method: 'bank_transfer' }, baseItems, baseUser);
      expect(html).toContain('Chuyển khoản ngân hàng');
    });

    test('handles empty items array without crashing', () => {
      const html = orderConfirmation(baseOrder, [], baseUser);
      expect(html).toMatch(/^<!doctype html>/i);
      expect(html).not.toContain('undefined');
    });
  });

  describe('orderStatusUpdate', () => {
    const baseUser = { full_name: 'Trần Thị B' };

    test('renders each known status', () => {
      ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled', 'completed'].forEach(s => {
        const html = orderStatusUpdate({ id: 1 }, baseUser, s);
        expect(html).toMatch(/^<!doctype html>/i);
      });
    });

    test('contains order ID', () => {
      const html = orderStatusUpdate({ id: 9999 }, baseUser, 'confirmed');
      expect(html).toContain('#9999');
    });

    test('renders Cancelled status in red', () => {
      const html = orderStatusUpdate({ id: 1 }, baseUser, 'cancelled');
      expect(html).toContain('#ef4444');
    });

    test('renders Delivered status in green', () => {
      const html = orderStatusUpdate({ id: 1 }, baseUser, 'delivered');
      expect(html).toContain('#22c55e');
    });
  });
});
