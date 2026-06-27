-- RefineAI Coding Agent schema
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  niche TEXT,
  tech_stack JSONB DEFAULT '{}',
  plan JSONB DEFAULT '{}',
  status TEXT DEFAULT 'planning'
    CHECK (status IN ('planning','building','complete','error','paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','building','done','error','skipped')),
  score INTEGER DEFAULT 0,
  rounds_taken INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS file_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  code TEXT,
  review TEXT,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  task TEXT CHECK (task IN ('write','review','refine')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  type TEXT DEFAULT 'chat'
    CHECK (type IN ('chat','plan','confirm','progress','complete')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_created ON projects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_project ON files (project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_file_rounds_file ON file_rounds (file_id, round_number);
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages (project_id, created_at);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_projects_all" ON projects;
DROP POLICY IF EXISTS "anon_files_all" ON files;
DROP POLICY IF EXISTS "anon_file_rounds_all" ON file_rounds;
DROP POLICY IF EXISTS "anon_messages_all" ON messages;

CREATE POLICY "anon_projects_all" ON projects FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_files_all" ON files FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_file_rounds_all" ON file_rounds FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_messages_all" ON messages FOR ALL TO anon USING (true) WITH CHECK (true);
