-- ============================================================================
-- MIGRATION: Add deleted_at & is_active columns to orders table
-- Date: 05/08/2026
-- Purpose: Fix `column o.deleted_at does not exist` error in getOrders
-- ============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Index giúp lọc nhanh các đơn hàng chưa xoá
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_is_active ON orders(is_active);

-- Backfill
UPDATE orders SET is_active = TRUE WHERE is_active IS NULL;

-- Migration applied: orders.deleted_at + orders.is_active added successfully!