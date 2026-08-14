-- Migration: Allow NULL for address column in users table
-- Fix for OTP registration flow

-- Allow address to be NULL
ALTER TABLE users ALTER COLUMN address DROP NOT NULL;

-- Set existing NULL addresses to empty string
UPDATE users SET address = '' WHERE address IS NULL;
