-- Migration: Payment QR System
-- Creates payment_settings, payment_requests tables

BEGIN;

-- Payment settings (admin-configured QR info)
CREATE TABLE IF NOT EXISTS payment_settings (
    id              SERIAL PRIMARY KEY,
    bank_name       VARCHAR(100) NOT NULL DEFAULT 'MBBank',
    account_number  VARCHAR(50) NOT NULL DEFAULT '190067899999',
    account_holder  VARCHAR(200) NOT NULL DEFAULT 'CTY TNHH LAPTOPSTORE',
    account_content VARCHAR(200) DEFAULT NULL,
    qr_image_url    TEXT DEFAULT NULL,
    instructions    TEXT DEFAULT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Only one active setting at a time - handled by application logic

-- Payment requests (bill uploads by customers)
CREATE TABLE IF NOT EXISTS payment_requests (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          DECIMAL(15, 0) NOT NULL DEFAULT 0,
    bill_image_url  TEXT DEFAULT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note      TEXT DEFAULT NULL,
    reviewed_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMP DEFAULT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_order_id ON payment_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON payment_requests(created_at DESC);

-- Insert default settings
INSERT INTO payment_settings (bank_name, account_number, account_holder, account_content, is_active)
VALUES ('MBBank', '190067899999', 'CTY TNHH LAPTOPSTORE', NULL, true)
ON CONFLICT DO NOTHING;

COMMIT;
