-- Pictures on questions.
--
-- A question can carry one image, shown to the room above the question text.
-- The file lives in Supabase Storage rather than the database, and the row
-- keeps only its public URL.
--
-- Apply this before deploying the build that uses it: it adds the column, the
-- bucket and its policy, and widens create_quiz() and get_game_questions()
-- without changing either signature, so the build that is live right now keeps
-- working untouched (it simply never sends or reads an image).
--
-- Safe to run more than once. Apply supabase/fix6.sql and fix7.sql first.

-- ── 1. The column ──────────────────────────────────────────────────────────

ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── 2. Where the files go ──────────────────────────────────────────────────
-- Public read (the URL is what the row stores), 2 MB a file, images only.
-- Both limits are enforced by Storage itself, so a client that skips its own
-- checks still cannot put a 50 MB video in here.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question-media', 'question-media', TRUE, 2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Anyone may add a file, because anyone may write a quiz — the app has no
-- login. Nobody may overwrite or remove one, so an upload cannot destroy
-- somebody else's picture.
DROP POLICY IF EXISTS question_media_insert ON storage.objects;
CREATE POLICY question_media_insert ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'question-media');

DROP POLICY IF EXISTS question_media_read ON storage.objects;
CREATE POLICY question_media_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'question-media');

-- ── 3. Writing a quiz with pictures ────────────────────────────────────────
-- Same signature as before: the image travels inside p_questions, so an older
-- build that sends no "imageUrl" key still calls this function unchanged.
--
-- The URL is checked rather than trusted. Storing whatever string the caller
-- sent would let a quiz embed an image from anywhere — a tracking pixel, or a
-- picture whose owner can swap it out after the fact — so only a path inside
-- this project's own bucket is accepted.

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

  -- Anchored deliberately. A substring test would pass
  -- https://evil.example.com/x?/storage/v1/object/public/question-media/
  -- because the path it looks for can sit in the query string.
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

  INSERT INTO questions (quiz_id, text, options, correct_index, time_limit, sort_order, image_url)
  SELECT v_quiz_id,
         left(btrim(e.value ->> 'text'), 500),
         e.value -> 'options',
         GREATEST(0, LEAST(jsonb_array_length(e.value -> 'options') - 1,
                           COALESCE((e.value ->> 'correctIndex')::int, 0))),
         GREATEST(5, LEAST(300, COALESCE((e.value ->> 'timeLimit')::int, 20))),
         (e.ordinality - 1)::int,
         NULLIF(left(COALESCE(e.value ->> 'imageUrl', ''), 1000), '')
    FROM jsonb_array_elements(p_questions) WITH ORDINALITY AS e(value, ordinality);

  RETURN v_quiz_id;
END;
$$;

-- ── 4. Reading a quiz with pictures ────────────────────────────────────────
-- The returned table gains a column, which a RETURNS TABLE function cannot do
-- in place, so it is dropped and recreated. Masking is unchanged: the picture
-- is part of the question and travels with it, while correct_index still waits
-- until the room has been shown that question.

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
  image_url TEXT
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
         q.image_url
    FROM q
   ORDER BY q.idx;
$$;

GRANT EXECUTE ON FUNCTION public.get_game_questions(UUID, TEXT) TO anon, authenticated;
