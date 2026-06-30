-- Fine-tuned models managed through OpenAI fine-tuning API
CREATE TABLE IF NOT EXISTS fine_tuned_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT,
  base_model TEXT NOT NULL DEFAULT 'gpt-4o-2024-08-06',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'uploading', 'uploaded', 'queued', 'running', 'succeeded', 'failed')),
  training_examples_used INTEGER NOT NULL DEFAULT 0,
  openai_file_id TEXT,
  job_id TEXT,
  activated BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fine_tuned_models_status ON fine_tuned_models (status);
CREATE INDEX IF NOT EXISTS idx_fine_tuned_models_activated ON fine_tuned_models (activated);

ALTER TABLE fine_tuned_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_fine_tuned_models_all" ON fine_tuned_models;
CREATE POLICY "anon_fine_tuned_models_all" ON fine_tuned_models
  FOR ALL TO anon USING (true) WITH CHECK (true);
