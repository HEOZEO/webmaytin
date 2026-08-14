-- Remove view_history table and related functionality

-- Drop view_history table
DROP TABLE IF EXISTS view_history CASCADE;

-- Note: This migration removes the view history tracking feature
-- as it has been removed from the application
