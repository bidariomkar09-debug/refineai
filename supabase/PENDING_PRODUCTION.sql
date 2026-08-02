-- Personal settings: timezone + default name for Omkar
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles';

UPDATE user_settings
SET account_name = 'Omkar'
WHERE id = 'default';
-- Chat mode tracking on messages and training sessions
ALTER TABLE messages ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'agent'
  CHECK (mode IN ('agent', 'ask', 'plan', 'debug'));

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'agent'
  CHECK (mode IN ('agent', 'ask', 'plan', 'debug'));
-- Personal AI memory: cross-project preferences and project summaries
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS personal_memory JSONB NOT NULL DEFAULT '{}'::jsonb;
-- Founder dogfood notes: what broke during daily builds
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS dogfood_log JSONB NOT NULL DEFAULT '[]'::jsonb;
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
