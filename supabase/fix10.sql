-- Reclaim a question's picture when its quiz is deleted.
--
-- Until now deleting a quiz took its rows and left its images in the bucket
-- for good: nothing could remove them, because the no-delete rule that stops
-- one person wiping another's pictures also stops the owner tidying up.
--
-- Two things make it work, and both are less obvious than they look.
--
-- The file has to go through the Storage API rather than by deleting the row
-- in storage.objects. Deleting the row drops the metadata and leaves the bytes
-- in S3 — still paid for, no longer reachable. So delete_quiz() reports which
-- files it orphaned and the browser removes them properly.
--
-- And the policy that allows that removal cannot ask "does a question still
-- use this file?" directly. A policy expression runs as the calling role, and
-- questions denies anon every row, so the NOT EXISTS would always be true and
-- every file in the bucket would become deletable. The check goes through a
-- SECURITY DEFINER function instead.
--
-- Safe to run more than once. Apply supabase/fix9.sql first.

-- ── 1. Is this file still spoken for? ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.question_media_in_use(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM questions
     WHERE image_url IS NOT NULL
       AND image_url LIKE '%/question-media/' || p_name
  );
$$;

GRANT EXECUTE ON FUNCTION public.question_media_in_use(TEXT) TO anon, authenticated;

-- ── 2. An orphan may be removed; a picture in use may not ──────────────────
-- This keeps the property that mattered: you still cannot delete a picture
-- somebody's quiz is using. What you can delete is one no quiz refers to any
-- more, which is exactly the rubbish left behind by a deleted quiz.

DROP POLICY IF EXISTS question_media_delete ON storage.objects;
CREATE POLICY question_media_delete ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (
    bucket_id = 'question-media'
    AND NOT public.question_media_in_use(name)
  );

-- ── 3. delete_quiz reports what it orphaned ────────────────────────────────
-- The return type changes, so the function is dropped and recreated. An older
-- build calls it exactly as before and ignores the array it now gets back;
-- those images simply stay, as they did already.

DROP FUNCTION IF EXISTS public.delete_quiz(UUID, TEXT);

CREATE FUNCTION public.delete_quiz(
  p_quiz_id   UUID,
  p_author_id TEXT
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_names   TEXT[];
  v_deleted INTEGER;
BEGIN
  -- Collected before the delete, because the rows are about to go. Only the
  -- part after the bucket name is kept: that is what Storage calls the object.
  SELECT COALESCE(array_agg(DISTINCT split_part(q.image_url, '/question-media/', 2)), '{}')
    INTO v_names
    FROM questions q
    JOIN quizzes z ON z.id = q.quiz_id
   WHERE q.quiz_id = p_quiz_id
     AND q.image_url IS NOT NULL
     AND z.author_id = p_author_id
     AND p_author_id <> '';

  DELETE FROM quizzes WHERE id = p_quiz_id AND author_id = p_author_id AND p_author_id <> '';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'That quiz could not be deleted.';
  END IF;

  -- Anything another quiz still uses stays. Two quizzes never share a file
  -- today, but nothing stops one being copied into another later.
  SELECT COALESCE(array_agg(n), '{}') INTO v_names
    FROM unnest(v_names) AS n
   WHERE NOT public.question_media_in_use(n);

  RETURN v_names;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_quiz(UUID, TEXT) TO anon, authenticated;
