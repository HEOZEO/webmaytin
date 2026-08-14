-- MIGRATION: Đồng bộ coupons.used_count = COUNT(coupon_usage) thực tế
-- Bối cảnh: trước kia INSERT INTO coupon_usage thất bại (ON CONFLICT sai cột)
-- → used_count tăng trong khi coupon_usage rỗng
-- → fix ON CONFLICT (đã làm) + chạy migration này để đồng bộ lại

BEGIN;

UPDATE coupons c
SET used_count = COALESCE((
  SELECT COUNT(*)::int FROM coupon_usage WHERE coupon_id = c.id
), 0);

-- Verify
SELECT
  c.id,
  c.code,
  c.max_uses,
  c.used_count AS old_used_count,
  COALESCE((SELECT COUNT(*)::int FROM coupon_usage WHERE coupon_id = c.id), 0) AS actual_used_count
FROM coupons c
WHERE c.used_count != COALESCE((SELECT COUNT(*)::int FROM coupon_usage WHERE coupon_id = c.id), 0);

COMMIT;