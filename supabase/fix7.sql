-- Row Level Security, part two: close the tables.
--
-- supabase/fix6.sql added the functions that do everything the browser used to
-- do by hand. Apply this only once a build that calls them is live — until
-- then the running app still writes to these tables directly, and this file
-- takes that away.
--
-- Safe to run more than once.

-- ── 1. Policies ────────────────────────────────────────────────────────────
-- Enabling RLS with no policy for a table denies the browser every operation
-- on it; the functions in fix6.sql run as the owner and are unaffected.

ALTER TABLE quizzes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE games     ENABLE ROW LEVEL SECURITY;
ALTER TABLE players   ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON quizzes;
DROP POLICY IF EXISTS "Allow all" ON questions;
DROP POLICY IF EXISTS "Allow all" ON games;
DROP POLICY IF EXISTS "Allow all" ON players;
DROP POLICY IF EXISTS "Allow all" ON answers;

-- quizzes, questions and answers keep no policy at all, so they are reachable
-- only through the SECURITY DEFINER functions in fix6.sql.
DROP POLICY IF EXISTS games_read ON games;
DROP POLICY IF EXISTS players_read ON players;

-- Games and players stay readable so the join screen can look up a PIN and so
-- Realtime can push lobby and leaderboard changes; neither holds a secret.
CREATE POLICY games_read   ON games   FOR SELECT USING (true);
CREATE POLICY players_read ON players FOR SELECT USING (true);

-- ── 2. Realtime ────────────────────────────────────────────────────────────
-- Nothing subscribes to answers any more, and with no read policy the stream
-- would be empty anyway. Players carry the same signal: every scored answer
-- updates the answering player's row.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE answers;
  END IF;
END $$;
