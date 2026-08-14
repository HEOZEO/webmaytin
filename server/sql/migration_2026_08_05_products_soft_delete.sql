-- ============================================================================
-- MIGRATION: Add deleted_at & is_active columns to products table
-- Date: 05/08/2026
-- Purpose: Fix `column p.deleted_at does not exist` error in getProducts
-- ============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Index giúp lọc nhanh các sản phẩm chưa xoá
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Backfill: đảm bảo các bản ghi cũ được coi là "active"
UPDATE products SET is_active = TRUE WHERE is_active IS NULL;

-- Migration applied: products.deleted_at + products.is_active added successfully!