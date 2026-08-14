-- ============================================================================
-- MIGRATION: Add district_id and ward_id to addresses table
-- Date: 05/08/2026
-- Purpose: Thêm cột district_id và ward_id để liên kết với bảng districts và wards
-- ============================================================================

BEGIN;

-- Thêm cột district_id nếu chưa tồn tại
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'addresses') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'addresses' AND column_name = 'district_id'
    ) THEN
      ALTER TABLE addresses ADD COLUMN district_id INTEGER REFERENCES districts(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Thêm cột ward_id nếu chưa tồn tại
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'addresses') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'addresses' AND column_name = 'ward_id'
    ) THEN
      ALTER TABLE addresses ADD COLUMN ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Tạo index để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_district ON addresses(district_id);
CREATE INDEX IF NOT EXISTS idx_addresses_ward ON addresses(ward_id);

COMMIT;
