-- A/B model comparison test results
CREATE TABLE IF NOT EXISTS model_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_prompt TEXT NOT NULL,
  model_a TEXT NOT NULL,
  model_b TEXT NOT NULL,
  model_a_score INTEGER NOT NULL DEFAULT 0,
  model_b_score INTEGER NOT NULL DEFAULT 0,
  model_a_rounds INTEGER NOT NULL DEFAULT 0,
  model_b_rounds INTEGER NOT NULL DEFAULT 0,
  model_a_tokens INTEGER NOT NULL DEFAULT 0,
  model_b_tokens INTEGER NOT NULL DEFAULT 0,
  winner TEXT NOT NULL CHECK (winner IN ('model_a', 'model_b', 'tie')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_comparisons_created ON model_comparisons (created_at DESC);

ALTER TABLE model_comparisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_model_comparisons_all" ON model_comparisons;
CREATE POLICY "anon_model_comparisons_all" ON model_comparisons
  FOR ALL TO anon USING (true) WITH CHECK (true);
