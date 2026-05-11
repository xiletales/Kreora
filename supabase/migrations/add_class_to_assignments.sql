-- ============================================================
-- Add class scoping to assignments
-- Run in Supabase Dashboard → SQL Editor
-- Idempotent: safe to run multiple times.
-- ============================================================

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS class TEXT;

CREATE INDEX IF NOT EXISTS idx_assignments_class
  ON public.assignments (class);

-- If a previous version of this migration created a `class_name` column,
-- copy any data over and drop it so the codebase has a single source of truth.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'assignments'
      AND column_name = 'class_name'
  ) THEN
    UPDATE public.assignments SET class = COALESCE(class, class_name);
    ALTER TABLE public.assignments DROP COLUMN class_name;
  END IF;
END $$;
