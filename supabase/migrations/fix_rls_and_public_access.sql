-- ============================================================
-- Run these in the Supabase Dashboard → SQL Editor
-- ============================================================


-- ── 1. profiles: allow anon to read (needed for login lookup) ──────────────
-- Without this policy, the NISN/username lookup before auth returns null,
-- causing the "Account not found" error even when the account exists.

CREATE POLICY "Public can read profiles for login"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);


-- ── 2. comments: add guest_name column ────────────────────────────────────
-- Stores the name of visitors who comment without an account.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS guest_name TEXT;


-- ── 3. comments: allow anyone to insert ───────────────────────────────────
-- Guests (anon) can post comments; author_id will be null for guests.

CREATE POLICY "Anyone can insert comments"
  ON public.comments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);


-- ── 4. comments: allow anyone to read ─────────────────────────────────────

CREATE POLICY "Anyone can read comments"
  ON public.comments FOR SELECT
  TO anon, authenticated
  USING (true);


-- ── 5. artworks: allow anyone to read ─────────────────────────────────────
-- Gallery is public; visitors can browse without an account.

CREATE POLICY "Anyone can read artworks"
  ON public.artworks FOR SELECT
  TO anon, authenticated
  USING (status = 'published');


-- ── 6. artwork_likes: allow anyone to read ────────────────────────────────

CREATE POLICY "Anyone can read likes"
  ON public.artwork_likes FOR SELECT
  TO anon, authenticated
  USING (true);


-- ── 7. increment_artwork_likes RPC ────────────────────────────────────────
-- A SECURITY DEFINER function lets guests safely increment/decrement the
-- likes counter without needing direct UPDATE permission on artworks.
-- The code calls: supabase.rpc('increment_artwork_likes', { art_id, delta })

CREATE OR REPLACE FUNCTION public.increment_artwork_likes(art_id TEXT, delta INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE artworks
  SET likes = GREATEST(0, COALESCE(likes, 0) + delta)
  WHERE id = art_id::uuid;
END;
$$;

-- Allow both anon and authenticated users to call the function
GRANT EXECUTE ON FUNCTION public.increment_artwork_likes(TEXT, INTEGER) TO anon, authenticated;
