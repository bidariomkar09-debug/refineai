-- Personal AI memory: cross-project preferences and project summaries
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS personal_memory JSONB NOT NULL DEFAULT '{}'::jsonb;
