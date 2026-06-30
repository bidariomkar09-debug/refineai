-- LoopModel API — developer platform (infrastructure layer)
CREATE TABLE IF NOT EXISTS loopmodel_developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loopmodel_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES loopmodel_developers(id) ON DELETE CASCADE,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Default',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loopmodel_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES loopmodel_api_keys(id) ON DELETE SET NULL,
  developer_id UUID REFERENCES loopmodel_developers(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  latency_ms INTEGER,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loopmodel_usage_created ON loopmodel_api_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loopmodel_keys_hash ON loopmodel_api_keys (key_hash);

INSERT INTO loopmodel_developers (name, email, plan)
SELECT 'RefineAI Platform', 'platform@refineai.app', 'enterprise'
WHERE NOT EXISTS (SELECT 1 FROM loopmodel_developers LIMIT 1);

ALTER TABLE loopmodel_developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loopmodel_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE loopmodel_api_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_loopmodel_developers_all" ON loopmodel_developers;
CREATE POLICY "anon_loopmodel_developers_all" ON loopmodel_developers
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_loopmodel_api_keys_all" ON loopmodel_api_keys;
CREATE POLICY "anon_loopmodel_api_keys_all" ON loopmodel_api_keys
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_loopmodel_api_usage_all" ON loopmodel_api_usage;
CREATE POLICY "anon_loopmodel_api_usage_all" ON loopmodel_api_usage
  FOR ALL TO anon USING (true) WITH CHECK (true);
