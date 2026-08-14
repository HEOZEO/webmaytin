-- Migration: Add transfer_content column to payment_requests
-- This column stores the transfer reference (order ID) for QR payment

BEGIN;

-- Add transfer_content column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_requests' AND column_name = 'transfer_content'
    ) THEN
        ALTER TABLE payment_requests ADD COLUMN transfer_content VARCHAR(100) DEFAULT NULL;
        RAISE NOTICE 'Added transfer_content column to payment_requests';
    ELSE
        RAISE NOTICE 'transfer_content column already exists in payment_requests';
    END IF;
END $$;

-- Add index for transfer_content if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_payment_requests_transfer_content'
    ) THEN
        CREATE INDEX idx_payment_requests_transfer_content ON payment_requests(transfer_content);
        RAISE NOTICE 'Created index idx_payment_requests_transfer_content';
    ELSE
        RAISE NOTICE 'Index idx_payment_requests_transfer_content already exists';
    END IF;
END $$;

COMMIT;
