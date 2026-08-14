-- Migration: Allow NULL and set default for username
-- Fix for OTP registration flow

-- Allow username to be NULL with a default
ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
ALTER TABLE users ALTER COLUMN username SET DEFAULT NULL;

-- Set existing NULL usernames from email prefix
UPDATE users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;
