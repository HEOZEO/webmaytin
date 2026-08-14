-- Migration: Drop duplicate 2-column unique index on coupon_usage
-- Lý do: index `idx_coupon_usage_coupon_user` UNIQUE (coupon_id, user_id) khiến
-- mỗi user chỉ dùng được 1 mã đúng 1 lần → INSERT thất bại khi user đặt đơn thứ 2
-- cùng mã (cùng (coupon_id, user_id), order_id khác).
-- Index đúng là `coupon_usage_coupon_id_user_id_order_id_key` UNIQUE 3 cột
-- (cho phép user dùng cùng mã nhiều lần trên các đơn khác nhau).
DROP INDEX IF EXISTS public.idx_coupon_usage_coupon_user;
