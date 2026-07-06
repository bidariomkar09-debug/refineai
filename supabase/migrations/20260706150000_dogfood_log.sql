-- Founder dogfood notes: what broke during daily builds
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS dogfood_log JSONB NOT NULL DEFAULT '[]'::jsonb;
