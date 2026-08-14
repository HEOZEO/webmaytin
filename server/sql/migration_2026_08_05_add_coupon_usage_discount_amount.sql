-- ============================================================================
-- MIGRATION: Add discount_amount column to coupon_usage table
-- Date: 05/08/2026
-- Purpose: Fix `column "discount_amount" of relation "coupon_usage" does
--          not exist` error in createOrder (orderController.js:244).
--          The seed.js / add_admin_tables.sql created the column as
--          `discount_applied`, but analytics + order creation reference
--          `discount_amount`. We add the canonical name and keep the old
--          one in sync via trigger so existing reports still work.
-- ============================================================================

-- 1. Add the missing canonical column (IF NOT EXISTS so re-running is safe)
ALTER TABLE coupon_usage
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2);

-- 2. Backfill: copy any existing rows from the legacy column
UPDATE coupon_usage
  SET discount_amount = discount_applied
  WHERE discount_amount IS NULL
    AND discount_applied IS NOT NULL;

-- 3. Sync trigger: keep both columns in sync going forward.
--    Either side may be written; the other is mirrored automatically.
CREATE OR REPLACE FUNCTION sync_coupon_usage_discount_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.discount_amount IS NULL AND NEW.discount_applied IS NOT NULL THEN
    NEW.discount_amount := NEW.discount_applied;
  ELSIF NEW.discount_applied IS NULL AND NEW.discount_amount IS NOT NULL THEN
    NEW.discount_applied := NEW.discount_amount;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_coupon_usage_discount ON coupon_usage;
CREATE TRIGGER trg_sync_coupon_usage_discount
  BEFORE INSERT OR UPDATE ON coupon_usage
  FOR EACH ROW
  EXECUTE FUNCTION sync_coupon_usage_discount_columns();
