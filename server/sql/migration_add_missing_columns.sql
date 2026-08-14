-- ============================================================================
-- MIGRATION: Add missing columns for advanced features
-- Date: 02/08/2026
-- Purpose: Bổ sung các cột còn thiếu cho Coupon, Banner, Product
-- ============================================================================

-- 1. Coupon: thêm min_order_value (nếu chưa có)
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(15,2) DEFAULT 0;

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Cập nhật validate - trigger đếm used_count tự động (nếu bảng order_items hoặc order_coupon đã có)
-- (tùy thuộc vào schema order hiện tại của bạn)

-- 3. Banners: bổ sung gradient + button_text nếu chưa có
ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS gradient VARCHAR(255) DEFAULT 'from-cyan-500/20 via-blue-600/10 to-transparent';

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS button_text VARCHAR(100) DEFAULT 'Xem Ngay';

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 4. Products: bổ sung sale_price, sku, brand_id, category_id nếu chưa có
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku VARCHAR(50);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(15,2);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS screen_size VARCHAR(20);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS color VARCHAR(50);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS weight VARCHAR(50);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS battery VARCHAR(50);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand_id INTEGER;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id INTEGER;

-- 5. Notification: đảm bảo bảng notifications có cột type và metadata
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 6. Inventory: bảng inventory_transactions (nếu chưa tồn tại)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'sold', 'returned')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER,
  notes TEXT,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created ON inventory_transactions(created_at DESC);

-- 7. Coupons usage tracking (nếu bảng coupon_usage đã tồn tại thì thôi)
CREATE TABLE IF NOT EXISTS coupon_usage (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  discount_amount NUMERIC(15,2),
  used_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON coupon_usage(user_id);

-- 8. Reviews: bổ sung helpful_count nếu thiếu (giúp sort)
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;

-- 9. Cart: bổ sung saved_for_later flag
ALTER TABLE cart
  ADD COLUMN IF NOT EXISTS saved_for_later BOOLEAN DEFAULT false;

-- 10. Đảm bảo tất cả các role constraints
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    -- Đảm bảo cột role có constraint
    BEGIN
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('customer', 'staff', 'admin'));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- 11. Cập nhật trigger tăng used_count khi order sử dụng coupon (giả định orders có coupon_code)
CREATE OR REPLACE FUNCTION increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.coupon_code IS NOT NULL AND OLD.status != 'delivered' AND NEW.status = 'delivered' THEN
    UPDATE coupons
    SET used_count = used_count + 1
    WHERE UPPER(code) = UPPER(NEW.coupon_code);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_coupon_usage ON orders;
CREATE TRIGGER trg_increment_coupon_usage
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION increment_coupon_usage();

-- 12. Reports: view report cho admin
CREATE OR REPLACE VIEW view_revenue_report AS
SELECT
  DATE_TRUNC('day', o.created_at) AS day,
  COUNT(*) AS order_count,
  SUM(o.final_amount - COALESCE(o.shipping_fee, 0)) AS revenue,
  SUM(COALESCE(o.shipping_fee, 0)) AS shipping_revenue,
  SUM(COALESCE(o.discount_amount, 0)) AS total_discount
FROM orders o
WHERE o.status = 'delivered'
GROUP BY DATE_TRUNC('day', o.created_at);

COMMENT ON VIEW view_revenue_report IS 'Báo cáo doanh thu cho admin';

\echo 'Migration completed successfully!'
