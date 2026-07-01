-- Chat mode tracking on messages and training sessions
ALTER TABLE messages ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'agent'
  CHECK (mode IN ('agent', 'ask', 'plan', 'debug'));

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'agent'
  CHECK (mode IN ('agent', 'ask', 'plan', 'debug'));
