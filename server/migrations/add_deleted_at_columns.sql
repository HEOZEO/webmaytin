-- Add deleted_at column to products table for soft delete
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Add deleted_at column to other tables that might need it
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_brands_deleted_at ON brands(deleted_at);
CREATE INDEX IF NOT EXISTS idx_coupons_deleted_at ON coupons(deleted_at);