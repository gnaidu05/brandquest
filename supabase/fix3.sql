-- Fix host_id: change from UUID to TEXT so it can hold empty strings during creation
ALTER TABLE games ALTER COLUMN host_id TYPE TEXT;

-- Also fix player_id in answers to TEXT (it references players.id which is UUID, but let's be safe)
-- Actually player_id should stay UUID since it references players(id)

-- Ensure all policies exist
DROP POLICY IF EXISTS "Allow all" ON quizzes;
DROP POLICY IF EXISTS "Allow all" ON questions;
DROP POLICY IF EXISTS "Allow all" ON games;
DROP POLICY IF EXISTS "Allow all" ON players;
DROP POLICY IF EXISTS "Allow all" ON answers;

CREATE POLICY "Allow all" ON quizzes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON answers FOR ALL USING (true) WITH CHECK (true);
