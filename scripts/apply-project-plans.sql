-- Run this once in Supabase → SQL Editor (or `psql`) so Visual Plan Mode
-- can use the dedicated project_plans table. Until then, RefineAI still works
-- by storing clarifications inside projects.plan JSONB.

CREATE TABLE IF NOT EXISTS project_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  plan_text TEXT,
  flowchart TEXT,
  plain_english TEXT,
  build_preview JSONB DEFAULT '{}'::jsonb,
  questions JSONB DEFAULT '[]'::jsonb,
  clarifications JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'clarifying', 'ready', 'building', 'built')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_plans_project_id ON project_plans(project_id);
