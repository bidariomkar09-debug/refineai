-- Personal settings: timezone + default name for Omkar
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles';

UPDATE user_settings
SET account_name = 'Omkar'
WHERE id = 'default';
