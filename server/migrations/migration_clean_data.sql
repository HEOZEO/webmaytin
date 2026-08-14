-- Migration: Clean all data except products and admin account
-- WARNING: This will delete all orders, users (except admin), payments, notifications, etc.

BEGIN;

-- =====================================================
-- 1. Xóa các bảng phụ thuộc ORDER trước
-- =====================================================

-- Xóa order_items (phụ thuộc orders)
TRUNCATE TABLE order_items CASCADE;

-- Xóa payment_requests (phụ thuộc orders)
TRUNCATE TABLE payment_requests CASCADE;

-- Xóa notifications (phụ thuộc users)
TRUNCATE TABLE notifications CASCADE;

-- Xóa activity_logs
TRUNCATE TABLE activity_logs CASCADE;

-- Xóa cart
TRUNCATE TABLE cart CASCADE;

-- Xóa coupon_usage
TRUNCATE TABLE coupon_usage CASCADE;

-- Xóa orders (sau khi đã xóa các bảng phụ thuộc)
TRUNCATE TABLE orders CASCADE;

-- =====================================================
-- 2. Reset sản phẩm (khôi phục stock, sold về 0)
-- =====================================================

-- Reset stock và sold về giá trị ban đầu (nếu có cột original_stock)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'original_stock'
    ) THEN
        UPDATE products SET 
            stock = COALESCE(original_stock, 0),
            sold = 0;
        RAISE NOTICE 'Reset products stock from original_stock column';
    ELSE
        -- Nếu không có original_stock, chỉ reset sold về 0
        UPDATE products SET sold = 0;
        RAISE NOTICE 'Reset products sold to 0 (no original_stock column)';
    END IF;
END $$;

-- =====================================================
-- 3. Xóa tất cả users TRỪ admin
-- =====================================================

-- Đếm số user trước khi xóa
DO $$
DECLARE
    total_users INT;
    admin_count INT;
    deleted_count INT;
BEGIN
    SELECT COUNT(*) INTO total_users FROM users;
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    RAISE NOTICE 'Total users before cleanup: %', total_users;
    RAISE NOTICE 'Admin accounts: %', admin_count;
END $$;

-- Xóa users không phải admin (giữ lại tất cả user có role = 'admin')
DELETE FROM users WHERE role != 'admin';

-- Kiểm tra lại
DO $$
DECLARE
    remaining_users INT;
BEGIN
    SELECT COUNT(*) INTO remaining_users FROM users;
    RAISE NOTICE 'Remaining users after cleanup: %', remaining_users;
END $$;

-- =====================================================
-- 4. Reset coupons (giữ lại cấu hình, reset used_count)
-- =====================================================

UPDATE coupons SET used_count = 0;

-- =====================================================
-- 5. Reset shipping_methods (giữ lại cấu hình)
-- =====================================================

-- Không cần reset gì ở đây

-- =====================================================
-- 6. Reset payment_settings (giữ lại cấu hình)
-- =====================================================

-- Không cần reset gì ở đây

-- =====================================================
-- 7. Reset sequences (để ID bắt đầu lại từ 1)
-- =====================================================

-- Reset sequences cho các bảng đã truncate
ALTER SEQUENCE IF EXISTS orders_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payment_requests_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS activity_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS cart_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS coupon_usage_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS coupons_id_seq RESTART WITH 1;

COMMIT;

-- =====================================================
-- XÁC NHẬN KẾT QUẢ
-- =====================================================

SELECT 'orders' as table_name, COUNT(*) as row_count FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'payment_requests', COUNT(*) FROM payment_requests
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'activity_logs', COUNT(*) FROM activity_logs
UNION ALL
SELECT 'cart', COUNT(*) FROM cart
UNION ALL
SELECT 'coupon_usage', COUNT(*) FROM coupon_usage
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products
ORDER BY table_name;
