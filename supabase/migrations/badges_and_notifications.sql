-- ============================================================
-- Badges + Notifications schema
-- Run in Supabase Dashboard → SQL Editor (idempotent).
-- ============================================================

-- ── badges: align with code-driven shape ───────────────────────────────
-- The schema in schema.sql declares user_id UUID. We need a TEXT identifier
-- so it can store either a teacher UUID or a student NISN. Add `nisn` and
-- `name` columns (alongside any legacy badge_type) and a unique constraint
-- to dedupe per (nisn, name).

ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS nisn         TEXT,
  ADD COLUMN IF NOT EXISTS name         TEXT,
  ADD COLUMN IF NOT EXISTS description  TEXT,
  ADD COLUMN IF NOT EXISTS icon_url     TEXT,
  ADD COLUMN IF NOT EXISTS earned_at    TIMESTAMPTZ DEFAULT NOW();

-- Backfill `name` from legacy `badge_type` if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'badges' AND column_name = 'badge_type'
  ) THEN
    UPDATE public.badges SET name = COALESCE(name, badge_type) WHERE name IS NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS badges_nisn_name_key
  ON public.badges (nisn, name)
  WHERE nisn IS NOT NULL AND name IS NOT NULL;

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on badges" ON public.badges;
CREATE POLICY "Service role full access on badges"
  ON public.badges FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read badges" ON public.badges;
CREATE POLICY "Anyone can read badges"
  ON public.badges FOR SELECT TO anon, authenticated USING (true);


-- ── notifications ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_id    TEXT NOT NULL,
  recipient_type  TEXT CHECK (recipient_type IN ('teacher', 'student')),
  type            TEXT NOT NULL,
  message         TEXT NOT NULL,
  read            BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications (recipient_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Service role writes from server actions
DROP POLICY IF EXISTS "Service role full access on notifications" ON public.notifications;
CREATE POLICY "Service role full access on notifications"
  ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Recipients can read their own
DROP POLICY IF EXISTS "Read own notifications" ON public.notifications;
CREATE POLICY "Read own notifications"
  ON public.notifications FOR SELECT TO anon, authenticated
  USING (true);

-- Recipients can mark their own as read
DROP POLICY IF EXISTS "Mark own notifications read" ON public.notifications;
CREATE POLICY "Mark own notifications read"
  ON public.notifications FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);
