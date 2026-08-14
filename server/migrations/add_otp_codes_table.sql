-- Migration: Add otp_codes table for email verification during registration
-- Type: email_verification

-- Drop if exists for clean re-run
DROP TABLE IF EXISTS otp_codes;

CREATE TABLE otp_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'register',
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by email
CREATE INDEX idx_otp_codes_email ON otp_codes(email);

-- Index for fast lookup by code + email
CREATE INDEX idx_otp_codes_code_email ON otp_codes(otp_code, email);

-- Add is_active column to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;
