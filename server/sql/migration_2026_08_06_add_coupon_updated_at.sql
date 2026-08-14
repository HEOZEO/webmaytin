-- Migration: Add updated_at column to coupons table
-- Date: 2026-08-06

-- Add updated_at column if it doesn't exist
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Also ensure created_at exists (in case it was missed)
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index on updated_at for better query performance
CREATE INDEX IF NOT EXISTS idx_coupons_updated_at ON coupons(updated_at);
