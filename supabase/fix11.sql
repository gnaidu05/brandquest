-- A fourth kind: the player types the answer.
--
--   text  the room types instead of picking. What they type is judged against
--         the spellings the author accepts.
--
-- Everything until now assumed an answer is the index of an option, so this is
-- the first kind that needs the answers table to change: a typed answer is not
-- an index. selected_option becomes nullable and text_answer holds the words.
--
-- The accepted spellings live in the options column the other kinds already
-- use. One question can accept several — "USA" and "United States" — and the
-- first is the one shown to the room when the answer is revealed.
--
-- Matching is deliberately narrow. Case and spacing are not spelling, so
-- "  paris " scores the same as "Paris"; anything else is a different word and
-- does not score. There is no partial credit for a near miss.
--
-- Apply before deploying the build that uses it. submit_answer() gains a
-- defaulted parameter, so a build that calls it with the old five arguments
-- still resolves and still works.
--
-- Safe to run more than once. Apply supabase/fix10.sql first.

-- ── 1. Room for a typed answer ─────────────────────────────────────────────

ALTER TABLE answers ADD COLUMN IF NOT EXISTS text_answer TEXT;
ALTER TABLE answers ALTER COLUMN selected_option DROP NOT NULL;

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_kind_known;
ALTER TABLE questions
  ADD CONSTRAINT questions_kind_known CHECK (kind IN ('quiz', 'truefalse', 'poll', 'text'));

-- ── 2. What counts as the same spelling ────────────────────────────────────
-- Immutable so it can be used anywhere, including an index later if the
-- volume ever justifies one.

CREATE OR REPLACE FUNCTION public.normalise_answer(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(btrim(regexp_replace(COALESCE(p_text, ''), '\s+', ' ', 'g')));
$$;

GRANT EXECUTE ON FUNCTION public.normalise_answer(TEXT) TO anon, authenticated;

-- ── 3. Scoring a typed answer ──────────────────────────────────────────────
-- The five-argument form is dropped rather than left alongside: two functions
-- differing only by a defaulted argument are ambiguous to PostgREST. A caller
-- naming the original five arguments still binds to this one.

DROP FUNCTION IF EXISTS submit_answer(UUID, UUID, INTEGER, INTEGER, NUMERIC);
DROP FUNCTION IF EXISTS submit_answer(UUID, UUID, INTEGER, INTEGER, NUMERIC, TEXT);

CREATE FUNCTION submit_answer(
  p_game_id        UUID,
  p_player_id      UUID,
  p_question_index INTEGER,
  p_selected_option INTEGER,
  p_time_elapsed   NUMERIC,
  p_text_answer    TEXT DEFAULT NULL
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
  v_is_text   BOOLEAN;
  v_typed     TEXT;
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
  v_is_text := (v_question.kind = 'text');
  v_typed   := CASE WHEN v_is_text THEN left(COALESCE(p_text_answer, ''), 200) ELSE NULL END;

  IF v_is_poll THEN
    v_correct := FALSE;
    v_points  := 0;
    v_streak  := v_player.streak;
  ELSE
    IF v_is_text THEN
      -- Right if it matches any spelling the author accepts.
      v_correct := EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(v_question.options) AS accepted(value)
         WHERE public.normalise_answer(accepted.value) = public.normalise_answer(v_typed)
           AND public.normalise_answer(v_typed) <> ''
      );
    ELSE
      v_correct := (p_selected_option = v_question.correct_index);
    END IF;

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

  INSERT INTO answers (game_id, question_index, player_id, selected_option, correct, answer_time, points, text_answer)
  VALUES (p_game_id, p_question_index, p_player_id,
          CASE WHEN v_is_text THEN NULL ELSE p_selected_option END,
          v_correct, p_time_elapsed, v_points, v_typed)
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

  UPDATE players SET
    score          = score + v_points,
    streak         = v_streak,
    correct_count  = correct_count + (CASE WHEN v_correct THEN 1 ELSE 0 END),
    total_answered = total_answered + (CASE WHEN v_is_poll THEN 0 ELSE 1 END)
  WHERE id = p_player_id;

  RETURN QUERY SELECT FALSE, v_points, v_correct, v_streak;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_answer(UUID, UUID, INTEGER, INTEGER, NUMERIC, TEXT) TO anon, authenticated;

-- ── 4. Writing one ─────────────────────────────────────────────────────────
-- A typed question may accept a single spelling, where a question with options
-- to pick between needs at least two.

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
     WHERE COALESCE(e.value ->> 'kind', 'quiz') NOT IN ('quiz', 'truefalse', 'poll', 'text')
  ) THEN
    RAISE EXCEPTION 'A question must be a quiz, a true or false, a poll, or a typed answer.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_questions) e
     WHERE btrim(COALESCE(e.value ->> 'text', '')) = ''
        OR jsonb_typeof(e.value -> 'options') <> 'array'
        OR jsonb_array_length(e.value -> 'options')
             < CASE WHEN COALESCE(e.value ->> 'kind', 'quiz') = 'text' THEN 1 ELSE 2 END
        OR jsonb_array_length(e.value -> 'options') > 6
  ) THEN
    RAISE EXCEPTION 'Every question needs text, and between 2 and 6 options — or for a typed answer, 1 to 6 accepted spellings.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_questions) e
     WHERE COALESCE(e.value ->> 'kind', 'quiz') = 'text'
       AND EXISTS (
         SELECT 1 FROM jsonb_array_elements_text(e.value -> 'options') AS o(value)
          WHERE btrim(COALESCE(o.value, '')) = ''
       )
  ) THEN
    RAISE EXCEPTION 'An accepted spelling cannot be blank.';
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
              -- A typed answer has no option to pick, so the first accepted
              -- spelling stands as the one to show at the reveal.
              WHEN COALESCE(e.value ->> 'kind', 'quiz') = 'text' THEN 0
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

-- ── 5. The tally, which has no options to count ────────────────────────────
-- A typed question reports what the room actually wrote, most common first,
-- released on the same schedule as everything else.

-- Gains a column, which a RETURNS TABLE function cannot do in place.
DROP FUNCTION IF EXISTS public.get_answer_tally(UUID, INTEGER, TEXT);

CREATE FUNCTION public.get_answer_tally(
  p_game_id        UUID,
  p_question_index INTEGER,
  p_host_id        TEXT DEFAULT NULL
)
RETURNS TABLE (answered INTEGER, correct_count INTEGER, option_counts INTEGER[], text_answers JSONB)
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
    SELECT selected_option, correct, text_answer FROM answers
     WHERE game_id = p_game_id AND question_index = p_question_index
  ),
  qq AS (
    SELECT jsonb_array_length(options) AS option_count, options AS opts, kind FROM questions
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
         CASE WHEN r.revealed AND COALESCE((SELECT kind FROM qq), 'quiz') <> 'text' THEN (
           SELECT array_agg(x.c ORDER BY x.i)
             FROM (
               SELECT i, (SELECT count(*) FROM a WHERE a.selected_option = i)::int AS c
                 FROM generate_series(0, COALESCE((SELECT option_count FROM qq), 4) - 1) AS i
             ) x
         ) END,
         CASE WHEN r.revealed AND COALESCE((SELECT kind FROM qq), 'quiz') = 'text' THEN (
           SELECT COALESCE(jsonb_agg(jsonb_build_object('answer', d.answer, 'count', d.n, 'correct', d.ok)
                                     ORDER BY d.n DESC, d.answer), '[]'::jsonb)
             FROM (
               -- A right answer is shown the way the author spelled it; a wrong
               -- one the way the room most often wrote it. Either way spellings
               -- differing only by case or spacing are counted as one.
               SELECT COALESCE(accepted.value, NULLIF(t.raw, ''), '(blank)') AS answer, t.n, t.ok
                 FROM (
                   SELECT public.normalise_answer(a.text_answer) AS norm,
                          mode() WITHIN GROUP (ORDER BY btrim(COALESCE(a.text_answer, ''))) AS raw,
                          count(*)::int AS n,
                          bool_or(a.correct) AS ok
                     FROM a GROUP BY 1
                 ) t
                 LEFT JOIN LATERAL (
                   SELECT o.value
                     FROM jsonb_array_elements_text((SELECT opts FROM qq)) AS o(value)
                    WHERE public.normalise_answer(o.value) = t.norm
                    LIMIT 1
                 ) accepted ON t.ok
             ) d
         ) END
    FROM r;
$$;

GRANT EXECUTE ON FUNCTION public.get_answer_tally(UUID, INTEGER, TEXT) TO anon, authenticated;

-- ── 6. Not handing out the answer ──────────────────────────────────────────
-- For every other kind the options are the question: they have to be on screen
-- to be picked. For a typed one they are the answer, so they travel on the
-- same schedule correct_index already did — the host sees them throughout,
-- everyone else once the question is over.

CREATE OR REPLACE FUNCTION public.get_game_questions(
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
  ),
  r AS (
    SELECT q.*,
           (
                (p_host_id IS NOT NULL AND p_host_id <> ''
                 AND p_host_id = (SELECT host_id FROM g))
             OR (SELECT status FROM g) = 'finished'
             OR q.idx < (SELECT current_question_index FROM g)
             OR (q.idx = (SELECT current_question_index FROM g)
                 AND (SELECT status FROM g) = 'showingResults')
           ) AS revealed
      FROM q
  )
  SELECT r.id,
         r.text,
         CASE WHEN r.kind = 'text' AND NOT r.revealed THEN '[]'::jsonb ELSE r.options END,
         CASE WHEN r.revealed THEN r.correct_index END,
         r.time_limit,
         r.idx,
         r.image_url,
         r.kind
    FROM r
   ORDER BY r.idx;
$$;

GRANT EXECUTE ON FUNCTION public.get_game_questions(UUID, TEXT) TO anon, authenticated;
