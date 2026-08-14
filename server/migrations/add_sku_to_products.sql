-- Add SKU column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(50) UNIQUE;
