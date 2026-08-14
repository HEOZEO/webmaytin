-- ============================================================================
-- migration_2026_08_07_seed_user_coupons.sql
-- Auto-seed: gán mọi coupon đang hoạt động cho mọi user hiện có
-- (model "khuyến mãi công khai" - user có thể thấy & dùng)
-- Idempotent: dùng ON CONFLICT để chạy nhiều lần không lỗi
-- ============================================================================

INSERT INTO user_coupons (user_id, coupon_id, assigned_at, expires_at, is_used)
SELECT u.id,
       c.id,
       NOW(),
       c.valid_to,
       false
FROM users u
CROSS JOIN coupons c
WHERE c.is_active = true
  AND (c.valid_to IS NULL OR c.valid_to > NOW())
  AND (c.valid_from IS NULL OR c.valid_from <= NOW())
ON CONFLICT (user_id, coupon_id) DO NOTHING;