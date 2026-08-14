-- Migration: Add shipping_method_id to orders table
BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method_id INTEGER REFERENCES shipping_methods(id) ON DELETE SET NULL;

COMMIT;
