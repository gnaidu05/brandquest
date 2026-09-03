-- Run this to fix any schema issues
-- This is safe to run multiple times

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all" ON quizzes;
DROP POLICY IF EXISTS "Allow all" ON questions;
DROP POLICY IF EXISTS "Allow all" ON games;
DROP POLICY IF EXISTS "Allow all" ON players;
DROP POLICY IF EXISTS "Allow all" ON answers;

-- Fix options column: change TEXT[] to JSONB for better Supabase JS client compatibility
ALTER TABLE questions ALTER COLUMN options TYPE JSONB USING to_jsonb(options);

-- Recreate policies
CREATE POLICY "Allow all" ON quizzes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON answers FOR ALL USING (true) WITH CHECK (true);

-- Ensure realtime is enabled
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE answers;
