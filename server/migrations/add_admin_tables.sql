-- ====== NEW ADMIN TABLES MIGRATION ======

-- 1. Settings table - Store admin configuration
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  data_type VARCHAR(20) DEFAULT 'string',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Banners table - Promotional banners
CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link VARCHAR(255),
  position VARCHAR(50) DEFAULT 'home',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Coupon usage tracking
CREATE TABLE IF NOT EXISTS coupon_usage (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  discount_applied DECIMAL(15,2),
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(coupon_id, user_id, order_id)
);

-- 4. Inventory transactions - Track stock changes
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  previous_stock INTEGER,
  new_stock INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Enhanced activity logs for audit trail
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Email notification queue
CREATE TABLE IF NOT EXISTS email_notifications (
  id SERIAL PRIMARY KEY,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  template_name VARCHAR(100),
  variables JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  sent_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====== ADD MISSING COLUMNS ======

-- Add is_active to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add deleted_at for soft deletes on products
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add order status timestamps
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- ====== CREATE INDEXES ======

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id ON coupon_usage(order_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_admin_id ON inventory_transactions(admin_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity_type ON admin_audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient ON email_notifications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON email_notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_banners_position ON banners(position);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- ====== INITIAL SETTINGS DATA ======

INSERT INTO settings (key, value, description, data_type) VALUES
('store_name', 'LaptopLuxe', 'Store display name', 'string'),
('store_logo', '/images/logo.png', 'Logo image URL', 'string'),
('store_description', 'Premium Laptop Store - Your trusted source for high-quality laptops', 'Store description', 'string'),
('contact_email', 'support@laptopluxe.com', 'Support email address', 'string'),
('contact_phone', '+84-123-456-789', 'Support phone number', 'string'),
('store_address', 'Hanoi, Vietnam', 'Store address', 'string'),
('business_hours', '08:00 - 22:00', 'Business operating hours', 'string'),
('shipping_fee_fixed', '50000', 'Fixed shipping fee in VND', 'decimal'),
('low_stock_threshold', '10', 'Low stock alert threshold', 'integer'),
('max_file_upload_size', '5242880', 'Max file upload size in bytes', 'integer')
ON CONFLICT (key) DO NOTHING;

-- ====== INDEXES ON EXISTING TABLES ======

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

COMMIT;
