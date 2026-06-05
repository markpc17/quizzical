-- Add total_rounds to games. Default 5 preserves existing behaviour.
ALTER TABLE games ADD COLUMN IF NOT EXISTS total_rounds INT NOT NULL DEFAULT 5;

-- Widen round_number constraint to support up to 10 rounds
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_round_number_check;
ALTER TABLE rounds ADD CONSTRAINT rounds_round_number_check CHECK (round_number BETWEEN 1 AND 10);
