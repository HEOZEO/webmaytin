-- Fix payment_status check constraint to include 'cancelled'
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_status_check 
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'));
