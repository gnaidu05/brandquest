-- Scoring moves into the database.
--
-- submitAnswer made six sequential round trips per answer (existence check,
-- game, questions, player, insert, score update), so N players answering at
-- once meant ~6N requests in a burst. It also read-then-wrote with nothing
-- stopping two taps from both scoring, and it computed `correct` and `points`
-- in the browser — a client could post whatever score it liked.
--
-- This does the whole thing in one statement, under a row lock, server-side.
-- Safe to run more than once.

-- ── 1. One answer per player per question ──────────────────────────────────
-- Any duplicates already recorded would block the constraint. Keep the
-- earliest row of each set. Note this does not recompute scores that were
-- already awarded twice; it only stops it happening again.
DELETE FROM answers a
 USING answers b
 WHERE a.game_id = b.game_id
   AND a.question_index = b.question_index
   AND a.player_id = b.player_id
   AND (a.created_at, a.ctid) > (b.created_at, b.ctid);

ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_one_per_player_per_question;
ALTER TABLE answers
  ADD CONSTRAINT answers_one_per_player_per_question
  UNIQUE (game_id, question_index, player_id);

-- ── 2. Scoring in one round trip ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION submit_answer(
  p_game_id        UUID,
  p_player_id      UUID,
  p_question_index INTEGER,
  p_selected_option INTEGER,
  p_time_elapsed   NUMERIC
)
RETURNS TABLE (already_answered BOOLEAN, points INTEGER, correct BOOLEAN, streak INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game      games%ROWTYPE;
  v_question  questions%ROWTYPE;
  v_player    players%ROWTYPE;
  v_existing  answers%ROWTYPE;
  v_correct   BOOLEAN;
  v_points    INTEGER := 0;
  v_streak    INTEGER;
  v_fraction  NUMERIC;
  v_inserted  BOOLEAN;
BEGIN
  -- Lock the player first. Two taps from one device serialise here instead of
  -- both passing the "have you answered?" check and both scoring.
  SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT * INTO v_existing FROM answers
   WHERE game_id = p_game_id
     AND question_index = p_question_index
     AND player_id = p_player_id;
  IF FOUND THEN
    RETURN QUERY SELECT TRUE, v_existing.points, v_existing.correct, v_player.streak;
    RETURN;
  END IF;

  SELECT * INTO v_game FROM games WHERE id = p_game_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- question_index is a position in the sort_order sequence, which is how the
  -- client indexes it. OFFSET matches that even if sort_order has gaps.
  SELECT * INTO v_question FROM questions
   WHERE quiz_id = v_game.quiz_id
   ORDER BY sort_order
   OFFSET p_question_index LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- Correctness and points are decided here, never by the caller.
  v_correct := (p_selected_option = v_question.correct_index);

  IF v_correct THEN
    v_fraction := GREATEST(0, 1 - (p_time_elapsed / NULLIF(v_question.time_limit, 0)));
    v_points := ROUND(100 + v_fraction * 900);
    v_streak := v_player.streak + 1;
    IF v_streak >= 3 THEN
      v_points := v_points + 100;   -- streak bonus
    END IF;
  ELSE
    v_streak := 0;
  END IF;

  INSERT INTO answers (game_id, question_index, player_id, selected_option, correct, answer_time, points)
  VALUES (p_game_id, p_question_index, p_player_id, p_selected_option, v_correct, p_time_elapsed, v_points)
  ON CONFLICT (game_id, question_index, player_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Belt and braces: if a concurrent transaction won the race, report its row
  -- rather than scoring twice.
  IF NOT v_inserted THEN
    SELECT * INTO v_existing FROM answers
     WHERE game_id = p_game_id
       AND question_index = p_question_index
       AND player_id = p_player_id;
    RETURN QUERY SELECT TRUE, v_existing.points, v_existing.correct, v_player.streak;
    RETURN;
  END IF;

  UPDATE players SET
    score          = score + v_points,
    streak         = v_streak,
    correct_count  = correct_count + (CASE WHEN v_correct THEN 1 ELSE 0 END),
    total_answered = total_answered + 1
  WHERE id = p_player_id;

  RETURN QUERY SELECT FALSE, v_points, v_correct, v_streak;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_answer(UUID, UUID, INTEGER, INTEGER, NUMERIC) TO anon, authenticated;
