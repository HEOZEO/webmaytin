-- ============================================================================
-- migration_2026_08_07_add_user_coupons.sql
-- Bảng user_coupons: gán mã giảm giá cho user cụ thể (sync với tab Profile)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_coupons (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  coupon_id     INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  is_used       BOOLEAN NOT NULL DEFAULT false,
  used_order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  used_at       TIMESTAMPTZ,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_coupons_unique
  ON user_coupons(user_id, coupon_id);

CREATE INDEX IF NOT EXISTS idx_user_coupons_user_active
  ON user_coupons(user_id, is_used);

CREATE INDEX IF NOT EXISTS idx_user_coupons_coupon
  ON user_coupons(coupon_id);