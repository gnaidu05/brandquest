-- Safe fix: handles existing state gracefully

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all" ON quizzes;
DROP POLICY IF EXISTS "Allow all" ON questions;
DROP POLICY IF EXISTS "Allow all" ON games;
DROP POLICY IF EXISTS "Allow all" ON players;
DROP POLICY IF EXISTS "Allow all" ON answers;

-- Fix options column type
DO $$
BEGIN
  -- Only convert if the column is still TEXT[]
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'options' AND udt_name = '_text'
  ) THEN
    ALTER TABLE questions ALTER COLUMN options TYPE JSONB USING to_jsonb(options);
  END IF;
END $$;

-- Recreate policies with both USING and WITH CHECK
CREATE POLICY "Allow all" ON quizzes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON answers FOR ALL USING (true) WITH CHECK (true);

-- Only add to realtime if not already a member
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE games;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE players;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE answers;
  END IF;
END $$;
