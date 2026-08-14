-- ============================================================================
-- migration_2026_08_07_backfill_user_coupons.sql
-- Fix các mã đã tạo TRƯỚC KHI có logic auto-assign.
-- Chạy 1 LẦN DUY NHẤT để đồng bộ dữ liệu.
-- Idempotent: dùng ON CONFLICT DO NOTHING / DO UPDATE.
-- ============================================================================

-- 1. Gán mã còn active cho tất cả user (bỏ qua nếu đã có record)
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
  AND NOT EXISTS (
    SELECT 1 FROM user_coupons uc
    WHERE uc.user_id = u.id AND uc.coupon_id = c.id
  )
ON CONFLICT (user_id, coupon_id) DO NOTHING;

-- 2. Khôi phục is_used=false cho những user_coupons thuộc coupon active
UPDATE user_coupons uc
SET is_used = false,
    used_at = NULL,
    used_order_id = NULL,
    updated_at = NOW()
FROM coupons c
WHERE uc.coupon_id = c.id
  AND c.is_active = true
  AND (c.valid_to IS NULL OR c.valid_to > NOW())
  AND uc.is_used = true
  AND (uc.used_order_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.id = uc.used_order_id AND o.status != 'cancelled'
  ));

-- 3. Cập nhật expires_at cho user_coupons theo valid_to hiện tại của coupon
UPDATE user_coupons uc
SET expires_at = c.valid_to, updated_at = NOW()
FROM coupons c
WHERE uc.coupon_id = c.id
  AND (uc.expires_at IS DISTINCT FROM c.valid_to);
