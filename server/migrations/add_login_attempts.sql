-- Add login attempt tracking for account lockout mechanism
-- This prevents brute force attacks by temporarily locking accounts after N failed attempts

-- Create login_attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45) NOT NULL, -- Supports IPv4 and IPv6
  failed_attempt_count INTEGER DEFAULT 1,
  last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_locked BOOLEAN DEFAULT false,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add is_locked column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_account_locked BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_reset_at TIMESTAMP;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_users_is_locked ON users(is_account_locked) WHERE is_account_locked = true;

-- Insert comment explaining account lockout rules
-- Rules:
-- - Max 5 failed login attempts in 15 minutes
-- - Account locked for 15 minutes after exceeding limit
-- - Lock lifted automatically after 15 minutes
-- - Admin can manually unlock accounts
