-- Migration: Create training_phases table
-- Description: Stores training phase definitions received from UE5 stream
-- This replaces hardcoded phase names with dynamic data from the stream

-- =============================================================================
-- 1. Create training_phases table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.training_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_key TEXT NOT NULL UNIQUE,          -- e.g., 'A', 'B', 'C', 'Phase A', etc. (from stream)
  phase_name TEXT NOT NULL,                -- Human-readable name e.g., 'X-Ray Assessment'
  phase_order INTEGER NOT NULL DEFAULT 0,  -- Display/execution order
  description TEXT,                        -- Optional description
  is_active BOOLEAN NOT NULL DEFAULT true, -- Can disable phases without deleting
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. Add indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_training_phases_phase_key ON public.training_phases(phase_key);
CREATE INDEX IF NOT EXISTS idx_training_phases_phase_order ON public.training_phases(phase_order);
CREATE INDEX IF NOT EXISTS idx_training_phases_is_active ON public.training_phases(is_active);

-- =============================================================================
-- 3. Enable Row Level Security
-- =============================================================================

ALTER TABLE public.training_phases ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read phases (they're not sensitive)
CREATE POLICY "Anyone can view training phases"
  ON public.training_phases
  FOR SELECT
  USING (true);

-- Policy: Service role can do everything (for admin operations)
CREATE POLICY "Service role has full access to training phases"
  ON public.training_phases
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================================
-- 4. Create trigger for updated_at
-- =============================================================================

DROP TRIGGER IF EXISTS on_training_phase_updated ON public.training_phases;

CREATE TRIGGER on_training_phase_updated
  BEFORE UPDATE ON public.training_phases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 5. Grant permissions
-- =============================================================================

GRANT SELECT ON public.training_phases TO authenticated;
GRANT SELECT ON public.training_phases TO anon;
