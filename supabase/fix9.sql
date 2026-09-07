-- Three kinds of question.
--
--   quiz       what the app has always had: 2-6 options, one right, scored on
--              speed.
--   truefalse  a quiz with its two options fixed to True and False.
--   poll       no right answer. Everyone's pick is recorded and the split is
--              shown to the room, but nobody scores and nobody's streak moves.
--
-- Poll is the one that changes the shape of things. A question without a right
-- answer means correct_index has to be allowed to be absent rather than faked
-- as 0 — a fake would quietly make one option "correct" everywhere the rest of
-- the code trusts that column.
--
-- Apply before deploying the build that uses it. Neither create_quiz() nor
-- submit_answer() changes signature, and questions default to 'quiz', so the
-- build that is live right now keeps working untouched.
--
-- Safe to run more than once. Apply supabase/fix8.sql first.

-- ── 1. The column, and an honest correct_index ─────────────────────────────

ALTER TABLE questions ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'quiz';

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_kind_known;
ALTER TABLE questions
  ADD CONSTRAINT questions_kind_known CHECK (kind IN ('quiz', 'truefalse', 'poll'));

ALTER TABLE questions ALTER COLUMN correct_index DROP NOT NULL;

-- A poll has no right answer; anything else must have one.
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_correct_index_matches_kind;
ALTER TABLE questions
  ADD CONSTRAINT questions_correct_index_matches_kind CHECK (
    (kind = 'poll' AND correct_index IS NULL) OR
    (kind <> 'poll' AND correct_index IS NOT NULL)
  );

-- ── 2. Scoring, now that a question may not be scoreable ───────────────────
-- Unchanged for quiz and truefalse, including the row lock, the unique
-- constraint and the exactly-once behaviour those give. A poll answer is
-- recorded and nothing else: no points, and the streak is carried rather than
-- reset, because failing to be right is not the same as being wrong.

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
  v_is_poll   BOOLEAN;
BEGIN
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

  SELECT * INTO v_question FROM questions
   WHERE quiz_id = v_game.quiz_id
   ORDER BY sort_order
   OFFSET p_question_index LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found' USING ERRCODE = 'no_data_found';
  END IF;

  v_is_poll := (v_question.kind = 'poll');

  IF v_is_poll THEN
    -- answers.correct is NOT NULL and nothing reads it for a poll.
    v_correct := FALSE;
    v_points  := 0;
    v_streak  := v_player.streak;
  ELSE
    v_correct := (p_selected_option = v_question.correct_index);
    IF v_correct THEN
      v_fraction := GREATEST(0, 1 - (p_time_elapsed / NULLIF(v_question.time_limit, 0)));
      v_points := ROUND(100 + v_fraction * 900);
      v_streak := v_player.streak + 1;
      IF v_streak >= 3 THEN
        v_points := v_points + 100;
      END IF;
    ELSE
      v_streak := 0;
    END IF;
  END IF;

  INSERT INTO answers (game_id, question_index, player_id, selected_option, correct, answer_time, points)
  VALUES (p_game_id, p_question_index, p_player_id, p_selected_option, v_correct, p_time_elapsed, v_points)
  ON CONFLICT (game_id, question_index, player_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF NOT v_inserted THEN
    SELECT * INTO v_existing FROM answers
     WHERE game_id = p_game_id
       AND question_index = p_question_index
       AND player_id = p_player_id;
    RETURN QUERY SELECT TRUE, v_existing.points, v_existing.correct, v_player.streak;
    RETURN;
  END IF;

  -- A poll leaves every counter alone, so the accuracy shown on the results
  -- page stays a statement about the questions that had a right answer.
  UPDATE players SET
    score          = score + v_points,
    streak         = v_streak,
    correct_count  = correct_count + (CASE WHEN v_correct THEN 1 ELSE 0 END),
    total_answered = total_answered + (CASE WHEN v_is_poll THEN 0 ELSE 1 END)
  WHERE id = p_player_id;

  RETURN QUERY SELECT FALSE, v_points, v_correct, v_streak;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_answer(UUID, UUID, INTEGER, INTEGER, NUMERIC) TO anon, authenticated;

-- ── 3. Writing the three kinds ─────────────────────────────────────────────
-- Same signature: "kind" travels inside p_questions, so an older build that
-- sends none still writes quizzes exactly as before.

CREATE OR REPLACE FUNCTION public.create_quiz(
  p_title       TEXT,
  p_description TEXT,
  p_cover_color TEXT,
  p_author_id   TEXT,
  p_questions   JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz_id UUID;
  v_count   INTEGER;
BEGIN
  IF p_author_id IS NULL OR btrim(p_author_id) = '' THEN
    RAISE EXCEPTION 'An author id is required.';
  END IF;
  IF btrim(COALESCE(p_title, '')) = '' THEN
    RAISE EXCEPTION 'A quiz needs a title.';
  END IF;
  IF jsonb_typeof(p_questions) <> 'array' OR jsonb_array_length(p_questions) = 0 THEN
    RAISE EXCEPTION 'A quiz needs at least one question.';
  END IF;

  v_count := jsonb_array_length(p_questions);
  IF v_count > 100 THEN
    RAISE EXCEPTION 'A quiz can hold at most 100 questions.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_questions) e
     WHERE COALESCE(e.value ->> 'kind', 'quiz') NOT IN ('quiz', 'truefalse', 'poll')
  ) THEN
    RAISE EXCEPTION 'A question must be a quiz, a true or false, or a poll.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_questions) e
     WHERE jsonb_typeof(e.value -> 'options') <> 'array'
        OR jsonb_array_length(e.value -> 'options') < 2
        OR jsonb_array_length(e.value -> 'options') > 6
        OR btrim(COALESCE(e.value ->> 'text', '')) = ''
  ) THEN
    RAISE EXCEPTION 'Every question needs text and between 2 and 6 options.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_questions) e
     WHERE COALESCE(e.value ->> 'kind', 'quiz') = 'truefalse'
       AND jsonb_array_length(e.value -> 'options') <> 2
  ) THEN
    RAISE EXCEPTION 'A true or false question has exactly two options.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_questions) e
     WHERE COALESCE(e.value ->> 'imageUrl', '') <> ''
       AND (
            e.value ->> 'imageUrl' !~
              '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/question-media/[A-Za-z0-9._~/-]+$'
            OR position('..' IN (e.value ->> 'imageUrl')) > 0
           )
  ) THEN
    RAISE EXCEPTION 'A question image must be one uploaded to this quiz app.';
  END IF;

  INSERT INTO quizzes (title, description, cover_color, author_id, question_count)
  VALUES (
    left(btrim(p_title), 200),
    left(COALESCE(p_description, ''), 1000),
    COALESCE(NULLIF(btrim(p_cover_color), ''), '#8257ff'),
    p_author_id,
    v_count
  )
  RETURNING id INTO v_quiz_id;

  INSERT INTO questions (quiz_id, text, options, correct_index, time_limit, sort_order, image_url, kind)
  SELECT v_quiz_id,
         left(btrim(e.value ->> 'text'), 500),
         e.value -> 'options',
         CASE WHEN COALESCE(e.value ->> 'kind', 'quiz') = 'poll' THEN NULL
              ELSE GREATEST(0, LEAST(jsonb_array_length(e.value -> 'options') - 1,
                                     COALESCE((e.value ->> 'correctIndex')::int, 0)))
         END,
         GREATEST(5, LEAST(300, COALESCE((e.value ->> 'timeLimit')::int, 20))),
         (e.ordinality - 1)::int,
         NULLIF(left(COALESCE(e.value ->> 'imageUrl', ''), 1000), ''),
         COALESCE(e.value ->> 'kind', 'quiz')
    FROM jsonb_array_elements(p_questions) WITH ORDINALITY AS e(value, ordinality);

  RETURN v_quiz_id;
END;
$$;

-- ── 4. Reading, with the kind attached ─────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_game_questions(UUID, TEXT);

CREATE FUNCTION public.get_game_questions(
  p_game_id UUID,
  p_host_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  text TEXT,
  options JSONB,
  correct_index INTEGER,
  time_limit INTEGER,
  sort_order INTEGER,
  image_url TEXT,
  kind TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH g AS (
    SELECT quiz_id, host_id, status, current_question_index
      FROM games WHERE id = p_game_id
  ),
  q AS (
    SELECT questions.*,
           (row_number() OVER (ORDER BY questions.sort_order, questions.id))::int - 1 AS idx
      FROM questions
     WHERE quiz_id = (SELECT quiz_id FROM g)
  )
  SELECT q.id,
         q.text,
         q.options,
         CASE
           WHEN p_host_id IS NOT NULL AND p_host_id <> ''
                AND p_host_id = (SELECT host_id FROM g)          THEN q.correct_index
           WHEN (SELECT status FROM g) = 'finished'              THEN q.correct_index
           WHEN q.idx < (SELECT current_question_index FROM g)   THEN q.correct_index
           WHEN q.idx = (SELECT current_question_index FROM g)
                AND (SELECT status FROM g) = 'showingResults'    THEN q.correct_index
           ELSE NULL
         END AS correct_index,
         q.time_limit,
         q.idx AS sort_order,
         q.image_url,
         q.kind
    FROM q
   ORDER BY q.idx;
$$;

GRANT EXECUTE ON FUNCTION public.get_game_questions(UUID, TEXT) TO anon, authenticated;

-- ── 5. The tally, which is the whole point of a poll ───────────────────────
-- A poll has no correct_count to report. The split is released on the same
-- schedule as a quiz's, so nobody can read the room before answering.

CREATE OR REPLACE FUNCTION public.get_answer_tally(
  p_game_id        UUID,
  p_question_index INTEGER,
  p_host_id        TEXT DEFAULT NULL
)
RETURNS TABLE (answered INTEGER, correct_count INTEGER, option_counts INTEGER[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH g AS (
    SELECT quiz_id, host_id, status, current_question_index
      FROM games WHERE id = p_game_id
  ),
  a AS (
    SELECT selected_option, correct FROM answers
     WHERE game_id = p_game_id AND question_index = p_question_index
  ),
  qq AS (
    SELECT jsonb_array_length(options) AS options, kind FROM questions
     WHERE quiz_id = (SELECT quiz_id FROM g)
     ORDER BY sort_order OFFSET GREATEST(p_question_index, 0) LIMIT 1
  ),
  r AS (
    SELECT (
      (p_host_id IS NOT NULL AND p_host_id <> '' AND p_host_id = (SELECT host_id FROM g))
      OR (SELECT status FROM g) = 'finished'
      OR (SELECT current_question_index FROM g) > p_question_index
      OR ((SELECT current_question_index FROM g) = p_question_index
          AND (SELECT status FROM g) = 'showingResults')
    ) AS revealed
  )
  SELECT (SELECT count(*) FROM a)::int,
         CASE WHEN r.revealed AND COALESCE((SELECT kind FROM qq), 'quiz') <> 'poll'
              THEN (SELECT count(*) FROM a WHERE a.correct)::int END,
         CASE WHEN r.revealed THEN (
           SELECT array_agg(x.c ORDER BY x.i)
             FROM (
               SELECT i, (SELECT count(*) FROM a WHERE a.selected_option = i)::int AS c
                 FROM generate_series(0, COALESCE((SELECT options FROM qq), 4) - 1) AS i
             ) x
         ) END
    FROM r;
$$;

GRANT EXECUTE ON FUNCTION public.get_answer_tally(UUID, INTEGER, TEXT) TO anon, authenticated;
