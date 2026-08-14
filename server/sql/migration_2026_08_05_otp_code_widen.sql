-- ============================================================================
-- MIGRATION: Widen otp_codes.otp_code to store SHA-256 hash (64 chars)
-- Date: 05/08/2026
-- Purpose: Fix `value too long for type character varying(6)` because the
--          backend stores otp_code as a SHA-256 hex digest (64 chars), not
--          the 6-digit plain OTP that is emailed to the user.
-- ============================================================================

ALTER TABLE otp_codes
  ALTER COLUMN otp_code TYPE VARCHAR(128);

-- Migration applied: otp_codes.otp_code widened to VARCHAR(128).