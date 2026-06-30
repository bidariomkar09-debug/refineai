-- Model provider configuration (OpenAI, Replicate, RunPod, custom)
CREATE TABLE IF NOT EXISTS model_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('openai', 'replicate', 'runpod', 'custom')),
  endpoint_url TEXT,
  api_key_encrypted TEXT,
  model_name TEXT,
  is_active BOOLEAN DEFAULT false,
  cost_per_1k_tokens FLOAT,
  avg_latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_providers_active ON model_providers (is_active);

-- Request logs for cost, latency, and uptime tracking
CREATE TABLE IF NOT EXISTS provider_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES model_providers(id) ON DELETE SET NULL,
  provider_type TEXT NOT NULL,
  model_used TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  latency_ms INTEGER,
  score_after INTEGER,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_logs_created ON provider_request_logs (created_at DESC);

INSERT INTO model_providers (provider_name, provider_type, model_name, is_active, cost_per_1k_tokens)
SELECT 'OpenAI GPT-4o', 'openai', 'gpt-4o', true, 0.03
WHERE NOT EXISTS (
  SELECT 1 FROM model_providers WHERE provider_type = 'openai' AND model_name = 'gpt-4o'
);

ALTER TABLE model_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_request_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_model_providers_all" ON model_providers;
CREATE POLICY "anon_model_providers_all" ON model_providers
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_provider_logs_all" ON provider_request_logs;
CREATE POLICY "anon_provider_logs_all" ON provider_request_logs
  FOR ALL TO anon USING (true) WITH CHECK (true);
