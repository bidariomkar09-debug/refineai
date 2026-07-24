-- Runtime reliability: per-file verification, scoring, checkpoints, developer mode

ALTER TABLE files DROP CONSTRAINT IF EXISTS files_status_check;
ALTER TABLE files
  ADD CONSTRAINT files_status_check
  CHECK (status IN ('pending','building','done','error','skipped','needs_fix','best_effort'));

ALTER TABLE files
  ADD COLUMN IF NOT EXISTS ai_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS runtime_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS runtime_errors JSONB DEFAULT '[]'::jsonb;

ALTER TABLE file_rounds
  ADD COLUMN IF NOT EXISTS input_context TEXT,
  ADD COLUMN IF NOT EXISTS memory_context TEXT;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS build_checkpoint JSONB DEFAULT '{}'::jsonb;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS developer_mode BOOLEAN DEFAULT false;
