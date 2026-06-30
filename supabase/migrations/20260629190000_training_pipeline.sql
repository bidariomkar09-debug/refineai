-- Continuous training pipeline runs
CREATE TABLE IF NOT EXISTS training_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_number INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  stage TEXT DEFAULT 'collecting',
  new_examples_collected INTEGER DEFAULT 0,
  total_examples_used INTEGER DEFAULT 0,
  previous_model_id TEXT,
  new_model_id TEXT,
  comparison_result JSONB,
  was_promoted BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_training_pipeline_started ON training_pipeline (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_pipeline_status ON training_pipeline (status);

-- Pipeline controls (singleton)
CREATE TABLE IF NOT EXISTS pipeline_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  auto_training_paused BOOLEAN DEFAULT false,
  require_manual_approval BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO pipeline_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);

ALTER TABLE training_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_training_pipeline_all" ON training_pipeline;
CREATE POLICY "anon_training_pipeline_all" ON training_pipeline
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_pipeline_settings_all" ON pipeline_settings;
CREATE POLICY "anon_pipeline_settings_all" ON pipeline_settings
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_notifications_all" ON notifications;
CREATE POLICY "anon_notifications_all" ON notifications
  FOR ALL TO anon USING (true) WITH CHECK (true);
