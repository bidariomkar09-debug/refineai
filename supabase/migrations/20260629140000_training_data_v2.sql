-- Evolve training_data schema for full collection system

-- Add project_id and copy from legacy session_id (was project FK)
ALTER TABLE training_data
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

UPDATE training_data
SET project_id = session_id
WHERE project_id IS NULL AND session_id IS NOT NULL;

-- Drop old session_id FK to projects (name may vary; use IF EXISTS pattern)
ALTER TABLE training_data DROP CONSTRAINT IF EXISTS training_data_session_id_fkey;

-- Allow session_id to reference sessions table
ALTER TABLE training_data ALTER COLUMN session_id DROP NOT NULL;

-- Rename improvement → improvement_summary
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_data' AND column_name = 'improvement'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_data' AND column_name = 'improvement_summary'
  ) THEN
    ALTER TABLE training_data RENAME COLUMN improvement TO improvement_summary;
  END IF;
END $$;

-- Make input_context nullable
ALTER TABLE training_data ALTER COLUMN input_context DROP NOT NULL;

-- New columns
ALTER TABLE training_data
  ADD COLUMN IF NOT EXISTS score_improvement INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reached_threshold BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rounds_to_complete INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS temperature REAL DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS project_type TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS task_type TEXT;

-- Re-add session_id FK to sessions (nullable for legacy rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'training_data_session_id_sessions_fkey'
  ) THEN
    ALTER TABLE training_data
      ADD CONSTRAINT training_data_session_id_sessions_fkey
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Indexes per spec
CREATE INDEX IF NOT EXISTS idx_training_data_successful ON training_data (was_successful);
CREATE INDEX IF NOT EXISTS idx_training_data_score ON training_data (score_after);
