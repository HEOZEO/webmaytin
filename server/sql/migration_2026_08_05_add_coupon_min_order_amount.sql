-- ============================================================================
-- MIGRATION: Add min_order_amount column to coupons table
-- Date: 05/08/2026
-- Purpose: Fix `column "min_order_amount" does not exist` error in createOrder
--          (orderController.js:144 references `min_order_amount` in RETURNING clause)
-- ============================================================================

-- 1. Add the missing column (IF NOT EXISTS so re-running is safe)
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(15,2) DEFAULT 0;

-- 2. Backfill: existing rows already get 0 via DEFAULT, but make it explicit
UPDATE coupons SET min_order_amount = 0 WHERE min_order_amount IS NULL;

-- 3. Helpful index for queries that filter on min_order_amount (rarely used but cheap to add)
-- Skip index by default — column is part of UPDATE/SELECT only at checkout time, small cardinality.
