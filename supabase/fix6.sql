-- Row Level Security.
--
-- Every table carried `FOR ALL USING (true) WITH CHECK (true)`, and the anon
-- key that satisfies those policies ships inside the JavaScript bundle. So
-- anyone with the site open could read every question with its correct answer
-- before answering it, set their own score, delete another person's quiz, or
-- drive somebody else's game from the console.
--
-- The app has no login, so RLS cannot ask "who are you?" — there is no
-- auth.uid() to test. What it can do is stop the browser touching these tables
-- directly and route every write through a SECURITY DEFINER function that
-- checks the one thing the caller must already know:
--
--   * quizzes/games  — the author id (a UUID the host's browser generated and
--                      keeps in localStorage) to create, host, or delete
--   * games          — the host's own player id, to advance a game
--   * players        — nothing; joining a lobby is open by design
--
-- Correct answers and per-option tallies are withheld until the game has
-- reached that question, so a player cannot look one up early. The host, who
-- proves themselves with the host id, sees them straight away.
--
-- This is the first of two steps, and it changes nothing a browser can see:
-- it only adds the functions the app needs. Deploy the matching build, which
-- calls them, and then apply supabase/fix7.sql to close the tables. Doing it
-- the other way round would break every open tab until the deploy landed.
--
-- Safe to run more than once. Apply supabase/fix5.sql first.

-- ── 0. Columns and constraints the rest of this file relies on ─────────────

ALTER TABLE games ADD COLUMN IF NOT EXISTS question_start_time TIMESTAMPTZ;

-- A question's position in its quiz is `sort_order`, and submit_answer()
-- resolves the client's question index by offsetting into that order. With
-- duplicate sort_orders that offset is ambiguous, so make it a real key.
-- Existing rows are written 0..n-1 by the editor, so this is a no-op on them.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM questions GROUP BY quiz_id, sort_order HAVING count(*) > 1
  ) THEN
    WITH renumbered AS (
      SELECT id, (row_number() OVER (PARTITION BY quiz_id ORDER BY sort_order, id))::int - 1 AS n
      FROM questions
    )
    UPDATE questions q SET sort_order = r.n FROM renumbered r WHERE q.id = r.id;
  END IF;
END $$;

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_one_per_position;
ALTER TABLE questions
  ADD CONSTRAINT questions_one_per_position UNIQUE (quiz_id, sort_order);

-- Two live games sharing a PIN would make a join by PIN ambiguous. Nothing
-- stopped that before, so retire the older of any pair before adding the index.
UPDATE games SET status = 'finished', end_time = COALESCE(end_time, now())
 WHERE id IN (
   SELECT id FROM (
     SELECT id, row_number() OVER (PARTITION BY pin ORDER BY created_at DESC, id) AS n
       FROM games WHERE status <> 'finished'
   ) d WHERE d.n > 1
 );

DROP INDEX IF EXISTS idx_games_pin_active;
CREATE UNIQUE INDEX idx_games_pin_active ON games (pin) WHERE status <> 'finished';

-- ── 1. player_count is maintained by the database ──────────────────────────
-- It used to be incremented by the joining browser, which needed UPDATE on
-- games — the same grant that lets anyone drive anyone's game. Counting rows
-- also fixes the old behaviour of never going back down.

CREATE OR REPLACE FUNCTION public.sync_player_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id UUID := COALESCE(NEW.game_id, OLD.game_id);
BEGIN
  -- Matches nothing when the game itself is being deleted, which is fine.
  UPDATE games
     SET player_count = (SELECT count(*) FROM players WHERE game_id = v_game_id)
   WHERE id = v_game_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS players_sync_count ON players;
CREATE TRIGGER players_sync_count
AFTER INSERT OR DELETE ON players
FOR EACH ROW EXECUTE FUNCTION public.sync_player_count();

UPDATE games g
   SET player_count = (SELECT count(*) FROM players p WHERE p.game_id = g.id)
 WHERE g.player_count IS DISTINCT FROM (SELECT count(*) FROM players p WHERE p.game_id = g.id);

-- ── 2. Reading a quiz ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.list_quizzes(p_author_id TEXT)
RETURNS SETOF quizzes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM quizzes
   WHERE author_id = p_author_id AND p_author_id <> ''
   ORDER BY created_at DESC;
$$;

/*
 * The questions of the quiz a game is playing.
 *
 * `correct_index` comes back NULL until the room has been shown that question,
 * so the answer is not sitting in a response the player could read early. A
 * caller that passes the game's host id gets every answer immediately, because
 * the host screen displays them live.
 *
 * `sort_order` is renumbered to a dense 0..n-1 so the array index the client
 * uses is the same integer submit_answer() resolves.
 */
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
  sort_order INTEGER
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
         q.idx AS sort_order
    FROM q
   ORDER BY q.idx;
$$;

-- ── 3. Writing a quiz ──────────────────────────────────────────────────────

/*
 * Creates a quiz and its questions together.
 *
 * The browser used to insert the quiz row and then the question rows, so a
 * failure in between left a quiz claiming questions it did not have. One
 * statement, one transaction.
 */
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
     WHERE jsonb_typeof(e.value -> 'options') <> 'array'
        OR jsonb_array_length(e.value -> 'options') < 2
        OR jsonb_array_length(e.value -> 'options') > 6
        OR btrim(COALESCE(e.value ->> 'text', '')) = ''
  ) THEN
    RAISE EXCEPTION 'Every question needs text and between 2 and 6 options.';
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

  INSERT INTO questions (quiz_id, text, options, correct_index, time_limit, sort_order)
  SELECT v_quiz_id,
         left(btrim(e.value ->> 'text'), 500),
         e.value -> 'options',
         GREATEST(0, LEAST(jsonb_array_length(e.value -> 'options') - 1,
                           COALESCE((e.value ->> 'correctIndex')::int, 0))),
         GREATEST(5, LEAST(300, COALESCE((e.value ->> 'timeLimit')::int, 20))),
         (e.ordinality - 1)::int
    FROM jsonb_array_elements(p_questions) WITH ORDINALITY AS e(value, ordinality);

  RETURN v_quiz_id;
END;
$$;

/*
 * Deletes a quiz, its questions, its games, and everything under them.
 *
 * Only the author id that created the quiz can do it. That id is a UUID the
 * browser generated, so it works as a capability: you cannot delete a quiz
 * whose author id you have never seen.
 */
CREATE OR REPLACE FUNCTION public.delete_quiz(
  p_quiz_id   UUID,
  p_author_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM quizzes WHERE id = p_quiz_id AND author_id = p_author_id AND p_author_id <> '';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'That quiz could not be deleted.';
  END IF;
END;
$$;

-- ── 4. Running a game ──────────────────────────────────────────────────────

/*
 * Opens a game for a quiz and seats its host.
 *
 * The PIN is drawn here rather than in the browser, retried against a unique
 * index over live games, so two rooms cannot end up sharing one.
 */
CREATE OR REPLACE FUNCTION public.create_game_with_host(
  p_quiz_id   UUID,
  p_author_id TEXT,
  p_host_name TEXT
)
RETURNS TABLE (game_id UUID, pin TEXT, player_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id   UUID;
  v_pin       TEXT;
  v_player_id UUID;
  v_attempt   INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM quizzes
     WHERE id = p_quiz_id AND author_id = p_author_id AND p_author_id <> ''
  ) THEN
    RAISE EXCEPTION 'That quiz could not be hosted.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM questions WHERE quiz_id = p_quiz_id) THEN
    RAISE EXCEPTION 'That quiz has no questions yet.';
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_pin := lpad((floor(random() * 900000) + 100000)::bigint::text, 6, '0');
    BEGIN
      INSERT INTO games (quiz_id, pin, host_id, player_count, status, current_question_index)
      VALUES (p_quiz_id, v_pin, '', 0, 'lobby', -1)
      RETURNING id INTO v_game_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 20 THEN
        RAISE EXCEPTION 'Could not find a free game PIN. Try again.';
      END IF;
    END;
  END LOOP;

  INSERT INTO players (game_id, name, is_host)
  VALUES (v_game_id, left(btrim(COALESCE(NULLIF(btrim(p_host_name), ''), 'Host')), 24), TRUE)
  RETURNING id INTO v_player_id;

  UPDATE games SET host_id = v_player_id::text WHERE id = v_game_id;

  RETURN QUERY SELECT v_game_id, v_pin, v_player_id;
END;
$$;

/*
 * Seats a player in a lobby.
 *
 * The "has it started yet?" check used to be made by the joining browser, so
 * it could be skipped. It is made here, holding the game row, alongside a cap
 * that keeps one room from being filled by a script.
 */
CREATE OR REPLACE FUNCTION public.join_game(
  p_game_id UUID,
  p_name    TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game      games%ROWTYPE;
  v_name      TEXT := left(btrim(COALESCE(p_name, '')), 24);
  v_player_id UUID;
BEGIN
  IF v_name = '' THEN
    RAISE EXCEPTION 'Enter a name to join.';
  END IF;

  SELECT * INTO v_game FROM games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That game no longer exists.';
  END IF;
  IF v_game.status <> 'lobby' THEN
    RAISE EXCEPTION 'That game has already started, so it can''t be joined.';
  END IF;
  IF (SELECT count(*) FROM players WHERE game_id = p_game_id) >= 500 THEN
    RAISE EXCEPTION 'That game is full.';
  END IF;

  INSERT INTO players (game_id, name, is_host)
  VALUES (p_game_id, v_name, FALSE)
  RETURNING id INTO v_player_id;

  RETURN v_player_id;
END;
$$;

/*
 * Advances a game. Only the host can, and only they know the host id — it is
 * the UUID of their own player row, handed back by create_game_with_host().
 *
 * Whether a question is the last one is decided here rather than being taken
 * from the caller.
 */
CREATE OR REPLACE FUNCTION public.host_set_game_state(
  p_game_id UUID,
  p_host_id TEXT,
  p_action  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game  games%ROWTYPE;
  v_total INTEGER;
  v_now   TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_game FROM games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That game no longer exists.';
  END IF;
  IF p_host_id IS NULL OR p_host_id = '' OR v_game.host_id IS DISTINCT FROM p_host_id THEN
    RAISE EXCEPTION 'Only the host can do that.';
  END IF;

  SELECT count(*) INTO v_total FROM questions WHERE quiz_id = v_game.quiz_id;

  CASE p_action
    WHEN 'start' THEN
      IF v_game.status <> 'lobby' THEN RETURN; END IF;
      UPDATE games SET status = 'question', current_question_index = 0,
                       show_leaderboard = FALSE, start_time = v_now,
                       question_start_time = v_now
       WHERE id = p_game_id;

    WHEN 'show_results' THEN
      IF v_game.current_question_index >= v_total - 1 THEN
        UPDATE games SET status = 'finished', show_leaderboard = TRUE, end_time = v_now
         WHERE id = p_game_id;
      ELSE
        UPDATE games SET status = 'showingResults', show_leaderboard = TRUE
         WHERE id = p_game_id;
      END IF;

    WHEN 'next_question' THEN
      IF v_game.current_question_index + 1 >= v_total THEN
        UPDATE games SET status = 'finished', show_leaderboard = TRUE, end_time = v_now
         WHERE id = p_game_id;
      ELSE
        UPDATE games SET status = 'question',
                         current_question_index = v_game.current_question_index + 1,
                         show_leaderboard = FALSE, question_start_time = v_now
         WHERE id = p_game_id;
      END IF;

    WHEN 'end' THEN
      UPDATE games SET status = 'finished', end_time = v_now WHERE id = p_game_id;

    ELSE
      RAISE EXCEPTION 'Unknown action %', p_action USING ERRCODE = 'invalid_parameter_value';
  END CASE;
END;
$$;

/*
 * How the room answered one question.
 *
 * Individual answer rows carry `correct`, so a table anyone could read told a
 * player the right option as soon as one other person had picked it. Only the
 * shape of the vote leaves the database, and the breakdown is held back until
 * the question is over — before then a player learns nothing but how many
 * people have answered. The host sees it all along.
 */
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
  n AS (
    SELECT jsonb_array_length(options) AS options FROM questions
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
         CASE WHEN r.revealed THEN (SELECT count(*) FROM a WHERE a.correct)::int END,
         CASE WHEN r.revealed THEN (
           SELECT array_agg(x.c ORDER BY x.i)
             FROM (
               SELECT i, (SELECT count(*) FROM a WHERE a.selected_option = i)::int AS c
                 FROM generate_series(0, COALESCE((SELECT options FROM n), 4) - 1) AS i
             ) x
         ) END
    FROM r;
$$;

-- ── 5. Grants ──────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.list_quizzes(TEXT)                             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_game_questions(UUID, TEXT)                 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_quiz(TEXT, TEXT, TEXT, TEXT, JSONB)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_quiz(UUID, TEXT)                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_game_with_host(UUID, TEXT, TEXT)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_game(UUID, TEXT)                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.host_set_game_state(UUID, TEXT, TEXT)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_answer_tally(UUID, INTEGER, TEXT)          TO anon, authenticated;
