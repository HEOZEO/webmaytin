-- Thêm cột recipient_name để lưu tên người nhận tại thời điểm đặt hàng
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);
-- Thêm cột email để lưu email người nhận tại thời điểm đặt hàng
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Backfill từ users.full_name cho các đơn cũ (nếu có)
UPDATE orders o
SET recipient_name = u.full_name
FROM users u
WHERE o.user_id = u.id
  AND (o.recipient_name IS NULL OR o.recipient_name = '')
  AND u.full_name IS NOT NULL;

UPDATE orders o
SET email = u.email
FROM users u
WHERE o.user_id = u.id
  AND (o.email IS NULL OR o.email = '')
  AND u.email IS NOT NULL;
