-- Add expires_at to games; set default to 24 hours after creation.
-- Existing rows receive NULL (treated as non-expiring by the API).
ALTER TABLE games ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_games_expires_at ON games(expires_at);
