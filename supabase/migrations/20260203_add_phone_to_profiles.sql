-- Migration: Add phone column for SMS OTP authentication
-- Description: Adds phone column to user_profiles and updates trigger

-- =============================================================================
-- 1. Add phone column to user_profiles
-- =============================================================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- =============================================================================
-- 2. Add index for phone lookups
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON public.user_profiles(phone);

-- =============================================================================
-- 3. Update the handle_new_user function to include phone
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    phone,
    registration_type,
    approval_status,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'registration_type', 'lti'),
    COALESCE(NEW.raw_user_meta_data->>'approval_status', 'approved'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$;
