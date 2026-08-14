-- ============================================================================
-- MIGRATION: Critical fixes - applied 2026-08-04
-- Purpose: Fix index gaps, constraints, atomic stock/coupon, soft-delete support
-- ============================================================================

BEGIN;

-- 1. Add min_order_amount column to coupons (for consistency with app-level check)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'coupons') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'coupons' AND column_name = 'min_order_amount'
    ) THEN
      ALTER TABLE coupons ADD COLUMN min_order_amount NUMERIC(15,2) DEFAULT 0;
    END IF;
  END IF;
END $$;

-- 2. Ensure coupon_usage has discount_amount for accurate analytics
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'coupon_usage') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'coupon_usage' AND column_name = 'discount_amount'
    ) THEN
      ALTER TABLE coupon_usage ADD COLUMN discount_amount NUMERIC(15,2);
    END IF;
  END IF;
END $$;

-- 3. Indexes for performance / race condition prevention
CREATE INDEX IF NOT EXISTS idx_products_active_price ON products(is_active, price) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_method, status);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_requests_order ON payment_requests(order_id);

-- 4. Composite unique index on coupon_usage (prevent duplicate usage per order)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'coupon_usage') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'coupon_usage' AND indexname = 'coupon_usage_order_unique'
    ) THEN
      ALTER TABLE coupon_usage
        ADD CONSTRAINT coupon_usage_order_unique UNIQUE (coupon_id, order_id);
    END IF;
  END IF;
END $$;

-- 5. Add deleted_at to orders (for soft-delete)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'deleted_at'
    ) THEN
      ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMP;
    END IF;
  END IF;
END $$;

-- 6. CHECK constraint to prevent negative stock
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    BEGIN
      ALTER TABLE products
        ADD CONSTRAINT products_stock_nonneg CHECK (stock >= 0);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 7. CHECK constraint on order_items quantity
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
    BEGIN
      ALTER TABLE order_items
        ADD CONSTRAINT order_items_qty_positive CHECK (quantity > 0);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 8. Index on notifications for polling queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE link IS NOT NULL;

-- 9. Index for OTP cleanup queries
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_purpose
  ON otp_codes(email, purpose, created_at DESC);

-- 10. View for safe order listing (excludes cancelled/deleted by default)
CREATE OR REPLACE VIEW view_orders_active AS
SELECT * FROM orders WHERE status != 'cancelled' AND deleted_at IS NULL;

COMMIT;

\echo 'Migration 2026_08_04 critical fixes applied successfully'
