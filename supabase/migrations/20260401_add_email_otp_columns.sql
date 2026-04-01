-- Migration: Add email OTP columns for verification
-- Description: Adds otp_code and otp_expires_at columns to user_profiles for email-based OTP
-- Date: 2026-04-01

-- =============================================================================
-- 1. Add OTP columns to user_profiles
-- =============================================================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS otp_code TEXT,
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;

-- =============================================================================
-- 2. Add index for OTP expiry cleanup (optional, for maintenance queries)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_otp_expires
ON public.user_profiles(otp_expires_at)
WHERE otp_expires_at IS NOT NULL;

-- =============================================================================
-- 3. Add comment explaining the columns
-- =============================================================================

COMMENT ON COLUMN public.user_profiles.otp_code IS 'Temporary 6-digit OTP code for email verification during login';
COMMENT ON COLUMN public.user_profiles.otp_expires_at IS 'Expiration timestamp for the OTP code (10 minutes from generation)';
