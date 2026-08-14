-- Product Images Table
CREATE TABLE product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Specifications Table
CREATE TABLE product_specs (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  spec_name VARCHAR(100) NOT NULL,
  spec_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('COD', 'BANK_TRANSFER', 'MOMO', 'VNPAY', 'ZALOPAY')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  transaction_id VARCHAR(255),
  amount DECIMAL(15,2) NOT NULL,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipping Methods Table
CREATE TABLE shipping_methods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  estimated_days INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coupon Usage Table
CREATE TABLE coupon_usage (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER REFERENCES coupons(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings Table
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Banners Table
CREATE TABLE banners (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  link VARCHAR(500),
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_specs_product ON product_specs(product_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user ON coupon_usage(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_banners_active ON banners(is_active, order_index);

-- Insert default shipping methods
INSERT INTO shipping_methods (name, description, cost, estimated_days) VALUES
('Giao hàng tiêu chuẩn', 'Giao hàng trong 3-5 ngày', 30000, 4),
('Giao hàng nhanh', 'Giao hàng trong 1-2 ngày', 50000, 2),
('Giao hàng hỏa tốc', 'Giao hàng trong ngày', 100000, 1);

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
('site_name', 'Shop Máy Tính', 'Tên website'),
('site_email', 'info@shopmaytinh.com', 'Email liên hệ'),
('site_phone', '0123456789', 'Số điện thoại liên hệ'),
('site_address', '123 Đường ABC, Quận 1, TP.HCM', 'Địa chỉ cửa hàng'),
('free_shipping_threshold', '500000', 'Giá trị đơn hàng miễn phí ship'),
('order_auto_cancel_hours', '24', 'Tự động hủy đơn chưa thanh toán sau x giờ');