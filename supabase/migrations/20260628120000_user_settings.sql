-- User settings (singleton row for MVP — no auth)
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  account_name TEXT NOT NULL DEFAULT 'Developer',
  selected_model TEXT NOT NULL DEFAULT 'gpt-4o',
  score_threshold INTEGER NOT NULL DEFAULT 95 CHECK (score_threshold >= 90 AND score_threshold <= 99),
  max_rounds INTEGER NOT NULL DEFAULT 8 CHECK (max_rounds >= 3 AND max_rounds <= 20),
  temperature REAL NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 1),
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO user_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_user_settings_all" ON user_settings;
CREATE POLICY "anon_user_settings_all" ON user_settings
  FOR ALL TO anon USING (true) WITH CHECK (true);
