-- Migration: User Deletion Cleanup
-- Description: Ensures users can re-register with the same email after deletion
--
-- This migration:
-- 1. Creates a BEFORE DELETE trigger on auth.users to clean up auth.identities
-- 2. Adds ON DELETE CASCADE to training_sessions if not already present
-- 3. Adds ON DELETE CASCADE to admin_notifications if not already present

-- =============================================================================
-- 1. Create function to clean up auth.identities before user deletion
-- =============================================================================

CREATE OR REPLACE FUNCTION auth.handle_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth
AS $$
BEGIN
  -- Delete all identity records for this user
  -- This is critical for allowing re-registration with the same email
  DELETE FROM auth.identities WHERE user_id = OLD.id;

  -- Log the deletion (optional, for debugging)
  RAISE NOTICE 'Cleaned up identities for user: %', OLD.id;

  RETURN OLD;
END;
$$;

-- =============================================================================
-- 2. Create BEFORE DELETE trigger on auth.users
-- =============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.handle_user_deletion();

-- =============================================================================
-- 3. Ensure training_sessions has proper foreign key constraints
-- =============================================================================

-- Note: training_sessions uses a student JSONB field, not a direct user_id FK
-- The session_id in user_sessions links to the user, which already cascades
-- through user_profiles -> auth.users

-- Add ON DELETE CASCADE to admin_notifications if the constraint exists without it
DO $$
BEGIN
  -- Check if admin_notifications table exists and update FK if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admin_notifications'
  ) THEN
    -- Drop existing FK if it exists
    ALTER TABLE public.admin_notifications
      DROP CONSTRAINT IF EXISTS admin_notifications_user_id_fkey;

    -- Re-add with CASCADE
    ALTER TABLE public.admin_notifications
      ADD CONSTRAINT admin_notifications_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;

    RAISE NOTICE 'Updated admin_notifications FK with ON DELETE CASCADE';
  END IF;
END;
$$;

-- =============================================================================
-- 4. Ensure user_sessions has proper cleanup
-- =============================================================================

-- user_sessions doesn't have a direct FK to auth.users (uses email)
-- We'll create a trigger to clean up user_sessions when user is deleted

CREATE OR REPLACE FUNCTION public.cleanup_user_sessions_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all sessions for this user by email
  DELETE FROM public.user_sessions WHERE email = OLD.email;

  -- Also delete any training_sessions that reference this user
  -- training_sessions.student->>'user_id' matches the user ID
  DELETE FROM public.training_sessions
  WHERE student->>'user_id' = OLD.id::text;

  RETURN OLD;
END;
$$;

-- Create trigger on user_profiles (which cascades from auth.users)
DROP TRIGGER IF EXISTS on_user_profile_deleted ON public.user_profiles;

CREATE TRIGGER on_user_profile_deleted
  BEFORE DELETE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_user_sessions_on_delete();

-- =============================================================================
-- 5. Grant necessary permissions
-- =============================================================================

-- Ensure service role can execute the cleanup function
GRANT EXECUTE ON FUNCTION auth.handle_user_deletion() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_user_sessions_on_delete() TO service_role;
