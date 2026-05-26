-- ============================================================
-- Quizzicle – Initial Schema
-- ============================================================

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,            -- 6-char uppercase join code
  status TEXT NOT NULL DEFAULT 'lobby'  -- lobby | round_active | round_end | finished
    CHECK (status IN ('lobby','round_active','round_end','finished')),
  current_round INT NOT NULL DEFAULT 0,    -- 0 = not started, 1–5 = active round
  current_question INT NOT NULL DEFAULT 0, -- 0–9 index within current round
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_id INT NOT NULL CHECK (avatar_id BETWEEN 1 AND 20),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_score INT NOT NULL DEFAULT 0,
  total_time_ms INT NOT NULL DEFAULT 0
);

CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INT NOT NULL CHECK (round_number BETWEEN 1 AND 5),
  category_id INT NOT NULL,
  category_name TEXT NOT NULL,
  UNIQUE(game_id, round_number)
);

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  question_number INT NOT NULL CHECK (question_number BETWEEN 0 AND 9),
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  incorrect_answers JSONB NOT NULL DEFAULT '[]',
  opened_at TIMESTAMPTZ,               -- set server-side when question is broadcast
  UNIQUE(round_id, question_number)
);

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_taken_ms INT NOT NULL DEFAULT 0,
  UNIQUE(question_id, player_id)       -- one answer per player per question
);

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------

CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_rounds_game_id ON rounds(game_id);
CREATE INDEX idx_questions_round_id ON questions(round_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);
CREATE INDEX idx_answers_player_id ON answers(player_id);
CREATE INDEX idx_games_code ON games(code);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read on all tables (needed for real-time and game display)
CREATE POLICY "Public read access" ON games FOR SELECT USING (true);
CREATE POLICY "Public read access" ON players FOR SELECT USING (true);
CREATE POLICY "Public read access" ON rounds FOR SELECT USING (true);
CREATE POLICY "Public read access" ON questions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON answers FOR SELECT USING (true);

-- All writes go through Next.js API routes using the service_role key,
-- which bypasses RLS entirely — no additional write policies are needed.

-- ------------------------------------------------------------
-- Realtime Publication
-- ------------------------------------------------------------

-- Enable Realtime for tables that drive live game updates
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE questions;
