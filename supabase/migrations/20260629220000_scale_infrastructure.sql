-- Background jobs queue
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  payload JSONB,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status, created_at DESC);

-- Sliding window rate limit events
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_key TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_client ON rate_limit_events (client_key, created_at DESC);

-- Help chatbot question log
CREATE TABLE IF NOT EXISTS help_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT,
  confidence REAL DEFAULT 0,
  escalated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Status page incidents
CREATE TABLE IF NOT EXISTS status_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'resolved',
  impact TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS status_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_jobs_all" ON jobs;
CREATE POLICY "anon_jobs_all" ON jobs FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_rate_limit_all" ON rate_limit_events;
CREATE POLICY "anon_rate_limit_all" ON rate_limit_events FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_help_questions_all" ON help_questions;
CREATE POLICY "anon_help_questions_all" ON help_questions FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_status_incidents_all" ON status_incidents;
CREATE POLICY "anon_status_incidents_all" ON status_incidents FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_status_subscribers_all" ON status_subscribers;
CREATE POLICY "anon_status_subscribers_all" ON status_subscribers FOR ALL TO anon USING (true) WITH CHECK (true);

INSERT INTO status_incidents (title, status, impact, started_at, resolved_at)
SELECT 'Scheduled maintenance', 'resolved', 'minor', now() - interval '14 days', now() - interval '14 days' + interval '2 hours'
WHERE NOT EXISTS (SELECT 1 FROM status_incidents LIMIT 1);
