-- ============================================================================
-- MIGRATION: Add ward_id to orders table
-- Date: 05/08/2026
-- Purpose: Thêm cột ward_id để lưu thông tin phường/xã giao hàng
-- ============================================================================

BEGIN;

-- Thêm cột ward_id nếu chưa tồn tại
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'ward_id'
    ) THEN
      ALTER TABLE orders ADD COLUMN ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

COMMIT;
