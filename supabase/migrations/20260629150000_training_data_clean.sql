-- Cleaned training data ready for fine-tuning export
CREATE TABLE IF NOT EXISTS training_data_clean (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES training_data(id) ON DELETE SET NULL,
  session_id UUID,
  project_id UUID,
  target TEXT NOT NULL,
  input_context TEXT,
  output TEXT NOT NULL,
  critique TEXT NOT NULL,
  final_output TEXT NOT NULL,
  score_after INTEGER NOT NULL,
  rounds_to_complete INTEGER NOT NULL,
  model_used TEXT,
  file_type TEXT,
  project_type TEXT,
  task_type TEXT,
  split TEXT NOT NULL CHECK (split IN ('train', 'test')),
  cleaned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_data_clean_split ON training_data_clean (split);

ALTER TABLE training_data_clean ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_training_data_clean_all" ON training_data_clean;
CREATE POLICY "anon_training_data_clean_all" ON training_data_clean
  FOR ALL TO anon USING (true) WITH CHECK (true);
