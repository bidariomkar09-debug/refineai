-- RefineAI database schema
-- Run this in Supabase Dashboard → SQL Editor

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'stopped')),
  final_output TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  model TEXT DEFAULT 'gpt-4o',
  temperature REAL DEFAULT 0.7,
  score_threshold INTEGER DEFAULT 90,
  max_rounds INTEGER DEFAULT 12,
  system_prompt TEXT,
  json_mode BOOLEAN DEFAULT false,
  tokens_used INTEGER DEFAULT 0,
  time_taken REAL DEFAULT 0
);

-- Rounds table
CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  output TEXT,
  critique TEXT,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rounds_session_id ON rounds (session_id, round_number);

-- RLS (no auth — public read/write for MVP)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select sessions" ON sessions;
DROP POLICY IF EXISTS "Allow anon insert sessions" ON sessions;
DROP POLICY IF EXISTS "Allow anon update sessions" ON sessions;
DROP POLICY IF EXISTS "Allow anon select rounds" ON rounds;
DROP POLICY IF EXISTS "Allow anon insert rounds" ON rounds;

CREATE POLICY "Allow anon select sessions" ON sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert sessions" ON sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update sessions" ON sessions FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anon select rounds" ON rounds FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert rounds" ON rounds FOR INSERT TO anon WITH CHECK (true);
