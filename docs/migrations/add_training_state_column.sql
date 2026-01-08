-- Migration: Add training_state column to training_sessions table
-- Purpose: Store training state for session resume functionality
-- Run this in Supabase SQL Editor

-- Add the training_state JSONB column to store persisted training state
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS training_state JSONB DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN training_sessions.training_state IS 'Persisted training state for session resume. Contains mode, uiMode, currentTaskIndex, tool selections, camera state, explosion level, and cinematic timer remaining time.';

-- Create an index on training_state for faster queries (optional, but recommended)
CREATE INDEX IF NOT EXISTS idx_training_sessions_training_state
ON training_sessions USING GIN (training_state);

-- Example training_state structure:
-- {
--   "mode": "cinematic" | "training",
--   "uiMode": "normal" | "waypoint" | "task",
--   "currentTaskIndex": 0,
--   "taskName": "Scanning",
--   "phase": "Phase A",
--   "progress": 25,
--   "selectedTool": "XRay",
--   "selectedPipe": null,
--   "airPlugSelected": false,
--   "cameraMode": "Manual",
--   "cameraPerspective": "Front",
--   "explosionLevel": 0,
--   "cinematicTimeRemaining": 6500,
--   "lastUpdated": "2024-01-08T12:00:00.000Z"
-- }
