-- =============================================
-- QuizPlay Database Schema for Supabase
-- Run this in the Supabase SQL Editor
-- =============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_color TEXT DEFAULT '#46178f',
  author_id TEXT NOT NULL,
  question_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quizzes_author ON quizzes(author_id);

-- Questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_index INTEGER NOT NULL,
  time_limit INTEGER DEFAULT 20,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_questions_quiz ON questions(quiz_id, sort_order);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id),
  pin TEXT NOT NULL,
  host_id UUID,
  player_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'lobby' CHECK (status IN ('lobby', 'question', 'showingResults', 'finished')),
  current_question_index INTEGER DEFAULT -1,
  show_leaderboard BOOLEAN DEFAULT FALSE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_games_pin ON games(pin);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  total_answered INTEGER DEFAULT 0,
  is_host BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_players_game ON players(game_id);
CREATE INDEX idx_players_game_score ON players(game_id, score DESC);

-- Answers table
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id),
  selected_option INTEGER NOT NULL,
  correct BOOLEAN NOT NULL,
  answer_time NUMERIC NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_answers_game_question ON answers(game_id, question_index);
CREATE INDEX idx_answers_player_game ON answers(player_id, game_id);

-- Enable Row Level Security (RLS) but allow all operations for now
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Policies: allow all operations (public app, no auth required)
CREATE POLICY "Allow all" ON quizzes FOR ALL USING (true);
CREATE POLICY "Allow all" ON questions FOR ALL USING (true);
CREATE POLICY "Allow all" ON games FOR ALL USING (true);
CREATE POLICY "Allow all" ON players FOR ALL USING (true);
CREATE POLICY "Allow all" ON answers FOR ALL USING (true);

-- Enable realtime for game tables
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE answers;
