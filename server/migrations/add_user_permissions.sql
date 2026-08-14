-- ===========================================
-- Migration: Thêm cột permissions vào bảng users
-- Dùng để admin cấu hình chi tiết quyền cho từng nhân viên
-- ===========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Index GIN để query nhanh theo permissions
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN (permissions);

COMMENT ON COLUMN users.permissions IS 'Quyền chi tiết của nhân viên: { dashboard: bool, products: {view,create,update,delete}, orders: {view,create,update_status,cancel,delete,export}, inventory: {view,update}, users: {view,lock_customer}, analytics: {view}, contacts: {view,reply,delete} }';

-- Update existing staff users with default permissions (full access except admin-only)
UPDATE users
SET permissions = jsonb_build_object(
  'dashboard', true,
  'products', jsonb_build_object('view', true, 'create', true, 'update', true, 'delete', false, 'bulk_stock', true),
  'orders', jsonb_build_object('view', true, 'create', true, 'update_status', true, 'cancel', true, 'delete', false, 'export', false),
  'inventory', jsonb_build_object('view', true, 'update', true),
  'users', jsonb_build_object('view', true, 'lock_customer', true),
  'analytics', jsonb_build_object('view', true),
  'contacts', jsonb_build_object('view', true, 'reply', true, 'delete', false)
)
WHERE role = 'staff' AND (permissions IS NULL OR permissions = '{}'::jsonb);

-- Admin luôn có full permissions (override bất kể settings)
UPDATE users
SET permissions = '{"all": true}'::jsonb
WHERE role = 'admin';

COMMIT;