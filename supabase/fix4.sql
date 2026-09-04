-- Deleting a quiz that had ever been hosted failed on games_quiz_id_fkey:
-- questions cascade from quizzes, but games did not. Deleting a player with
-- answers recorded had the same problem via answers_player_id_fkey.
--
-- Safe to run more than once.

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_quiz_id_fkey;
ALTER TABLE games
  ADD CONSTRAINT games_quiz_id_fkey
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE;

ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_player_id_fkey;
ALTER TABLE answers
  ADD CONSTRAINT answers_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
