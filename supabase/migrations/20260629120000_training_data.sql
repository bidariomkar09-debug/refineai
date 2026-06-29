-- Training data collection for fine-tuning exports
CREATE TABLE IF NOT EXISTS training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  input_context TEXT NOT NULL,
  output TEXT NOT NULL,
  critique TEXT,
  score_before INTEGER NOT NULL DEFAULT 0 CHECK (score_before >= 0 AND score_before <= 100),
  score_after INTEGER NOT NULL CHECK (score_after >= 0 AND score_after <= 100),
  improvement TEXT,
  final_output TEXT,
  was_successful BOOLEAN NOT NULL DEFAULT false,
  model_used TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_data_session ON training_data (session_id, round_number);
CREATE INDEX IF NOT EXISTS idx_training_data_created ON training_data (created_at DESC);

ALTER TABLE training_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_training_data_all" ON training_data;
CREATE POLICY "anon_training_data_all" ON training_data
  FOR ALL TO anon USING (true) WITH CHECK (true);
