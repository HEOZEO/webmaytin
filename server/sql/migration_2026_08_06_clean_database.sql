-- =====================================================
-- CLEAN DATABASE: Keep Admin + Products Only
-- Created: 2026-08-06
-- =====================================================

BEGIN;

-- 1. Disable triggers temporarily for faster deletes
ALTER TABLE orders DISABLE TRIGGER ALL;
ALTER TABLE order_items DISABLE TRIGGER ALL;
ALTER TABLE cart DISABLE TRIGGER ALL;
ALTER TABLE wishlist DISABLE TRIGGER ALL;
ALTER TABLE reviews DISABLE TRIGGER ALL;
ALTER TABLE product_images DISABLE TRIGGER ALL;

-- 2. Delete order-related data first (foreign key constraints)
DELETE FROM order_items;
DELETE FROM orders;

-- 3. Delete user-related data (keep users with role = 'admin')
DELETE FROM addresses WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin');
DELETE FROM cart WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin');
DELETE FROM wishlist WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin');
DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin');

-- 4. Delete reviews (keep product data)
DELETE FROM reviews;

-- 5. Delete payment data
DELETE FROM payment_requests;
DELETE FROM payments;

-- 6. Delete marketing/promotion data
DELETE FROM coupon_usage;
DELETE FROM coupons;

-- 7. Delete OTP and sessions
DELETE FROM otp_codes;

-- 8. Delete login history
DELETE FROM login_attempts;

-- 9. Delete contact messages
DELETE FROM contact_messages;

-- 10. Delete admin logs
DELETE FROM admin_audit_logs;
DELETE FROM activity_logs;

-- 11. Delete view history
DELETE FROM view_history;

-- 12. Reset sequences
ALTER SEQUENCE orders_id_seq RESTART WITH 1;
ALTER SEQUENCE order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE cart_id_seq RESTART WITH 1;
ALTER SEQUENCE wishlist_id_seq RESTART WITH 1;
ALTER SEQUENCE reviews_id_seq RESTART WITH 1;
ALTER SEQUENCE payment_requests_id_seq RESTART WITH 1;
ALTER SEQUENCE coupons_id_seq RESTART WITH 1;
ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE contact_messages_id_seq RESTART WITH 1;
ALTER SEQUENCE login_attempts_id_seq RESTART WITH 1;
ALTER SEQUENCE admin_audit_logs_id_seq RESTART WITH 1;

-- Reset users sequence to max+1
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) + 1 FROM users), 1), false);

-- 13. Re-enable triggers
ALTER TABLE orders ENABLE TRIGGER ALL;
ALTER TABLE order_items ENABLE TRIGGER ALL;
ALTER TABLE cart ENABLE TRIGGER ALL;
ALTER TABLE wishlist ENABLE TRIGGER ALL;
ALTER TABLE reviews ENABLE TRIGGER ALL;
ALTER TABLE product_images ENABLE TRIGGER ALL;

-- 14. Reset product sold counts
UPDATE products SET sold = 0;

COMMIT;
