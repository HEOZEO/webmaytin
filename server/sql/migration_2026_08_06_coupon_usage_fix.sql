-- ============================================================================
-- MIGRATION: Fix coupon_usage table - ensure all required columns exist
-- Applied: 2026-08-06
-- ============================================================================

BEGIN;

-- 1. Add discount_amount column to coupon_usage (for analytics)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupon_usage' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE coupon_usage ADD COLUMN discount_amount NUMERIC(15,2);
    RAISE NOTICE 'Added discount_amount column to coupon_usage';
  ELSE
    RAISE NOTICE 'discount_amount column already exists in coupon_usage';
  END IF;
END $$;

-- 2. Ensure coupon_id is NOT NULL (required for our query filter)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupon_usage' AND column_name = 'coupon_id' AND is_nullable = 'YES'
  ) THEN
    -- First, set any NULL coupon_id to 0 (or we could delete those rows)
    UPDATE coupon_usage SET coupon_id = 0 WHERE coupon_id IS NULL;
    ALTER TABLE coupon_usage ALTER COLUMN coupon_id SET NOT NULL;
    RAISE NOTICE 'Set coupon_id NOT NULL in coupon_usage';
  ELSE
    RAISE NOTICE 'coupon_id already NOT NULL in coupon_usage';
  END IF;
END $$;

-- 3. Ensure user_id is NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupon_usage' AND column_name = 'user_id' AND is_nullable = 'YES'
  ) THEN
    UPDATE coupon_usage SET user_id = 0 WHERE user_id IS NULL;
    ALTER TABLE coupon_usage ALTER COLUMN user_id SET NOT NULL;
    RAISE NOTICE 'Set user_id NOT NULL in coupon_usage';
  ELSE
    RAISE NOTICE 'user_id already NOT NULL in coupon_usage';
  END IF;
END $$;

-- 4. Composite unique index on coupon_usage (prevent duplicate usage per order)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'coupon_usage' AND indexname = 'idx_coupon_usage_coupon_user'
  ) THEN
    CREATE UNIQUE INDEX idx_coupon_usage_coupon_user 
      ON coupon_usage(coupon_id, user_id);
    RAISE NOTICE 'Created index idx_coupon_usage_coupon_user';
  ELSE
    RAISE NOTICE 'Index idx_coupon_usage_coupon_user already exists';
  END IF;
END $$;

COMMIT;

\echo 'Migration coupon_usage fixes applied successfully'
