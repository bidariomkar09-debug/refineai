-- Production model switching configuration
CREATE TABLE IF NOT EXISTS model_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_model TEXT DEFAULT 'gpt-4o',
  fallback_model TEXT DEFAULT 'gpt-4o',
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  is_custom_model_enabled BOOLEAN DEFAULT false,
  custom_model_id TEXT,
  suggested_rollout_percentage INTEGER,
  rollout_suggestion_dismissed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO model_config (active_model, rollout_percentage)
SELECT 'gpt-4o', 0
WHERE NOT EXISTS (SELECT 1 FROM model_config LIMIT 1);

-- Custom model API failures (silent fallback triggers)
CREATE TABLE IF NOT EXISTS model_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_model TEXT NOT NULL,
  fallback_model TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_errors_created ON model_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_data_model_used ON training_data (model_used, created_at DESC);

ALTER TABLE model_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_model_config_all" ON model_config;
CREATE POLICY "anon_model_config_all" ON model_config
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_model_errors_all" ON model_errors;
CREATE POLICY "anon_model_errors_all" ON model_errors
  FOR ALL TO anon USING (true) WITH CHECK (true);
