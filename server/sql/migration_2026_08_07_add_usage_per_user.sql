-- ============================================================================
-- migration_2026_08_07_add_usage_per_user.sql
-- Thêm cột usage_per_user vào coupons để giới hạn số lần 1 tài khoản
-- có thể dùng 1 mã giảm giá
-- ============================================================================

BEGIN;

-- 1. Thêm cột usage_per_user vào bảng coupons
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'coupons') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'coupons' AND column_name = 'usage_per_user'
    ) THEN
      -- NULL = không giới hạn, 1 = mỗi tk chỉ dùng 1 lần, 3 = mỗi tk dùng tối đa 3 lần...
      ALTER TABLE coupons ADD COLUMN usage_per_user INTEGER DEFAULT NULL;
    END IF;
  END IF;
END $$;

-- 2. Cập nhật seed: gán thêm usage_per_user = 3 cho các coupon hiện có
-- (để mỗi user có thể dùng mỗi mã tối đa 3 lần, trừ khi admin đặt khác)
UPDATE coupons
SET usage_per_user = 3
WHERE usage_per_user IS NULL
  AND is_active = true
  AND (valid_to IS NULL OR valid_to > NOW());

COMMENT ON COLUMN coupons.usage_per_user IS
  'Số lần tối đa 1 tài khoản được dùng mã này. NULL = không giới hạn.';

COMMIT;