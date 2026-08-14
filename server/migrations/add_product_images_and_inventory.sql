-- Add product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- Add inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  reference_id INTEGER,
  reference_type VARCHAR(50),
  created_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at);

-- Add deleted_at to products if not exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add columns to products for better product management
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 12;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier VARCHAR(100);
