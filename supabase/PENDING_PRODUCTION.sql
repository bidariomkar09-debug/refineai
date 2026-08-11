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

-- Visual plan mode: presentation layer + user clarifications
CREATE TABLE IF NOT EXISTS project_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  plan_text TEXT,
  flowchart TEXT,
  plain_english TEXT,
  build_preview JSONB DEFAULT '{}'::jsonb,
  questions JSONB DEFAULT '[]'::jsonb,
  clarifications JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'clarifying', 'ready', 'building', 'built')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_plans_project_id ON project_plans(project_id);
