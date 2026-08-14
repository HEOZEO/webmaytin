-- Add is_active column to users table if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for is_active column
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Update all existing users to be active
UPDATE users SET is_active = true WHERE is_active IS NULL;
