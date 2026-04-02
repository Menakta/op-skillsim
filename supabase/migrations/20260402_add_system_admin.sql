-- Migration: Add system admin protection
-- This migration adds a flag to identify system admins who cannot be deleted

-- Add is_system_admin column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_system_admin
ON public.user_profiles(is_system_admin)
WHERE is_system_admin = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.is_system_admin IS 'If true, this user cannot be deleted and is a permanent system administrator';
