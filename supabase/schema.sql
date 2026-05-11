-- Kreora Database Schema for Supabase
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT CHECK (role IN ('student', 'teacher')) DEFAULT 'student',
  grade TEXT,
  class TEXT,
  subject_specialization TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Artworks table
CREATE TABLE artworks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT CHECK (status IN ('published', 'in_progress', 'pending')) DEFAULT 'pending',
  description TEXT,
  image_url TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assignment_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignments table
CREATE TABLE assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('video', 'visual', 'project')) DEFAULT 'visual',
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges table
CREATE TABLE badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  description TEXT,
  image_url TEXT,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Curated artworks (teacher curations)
CREATE TABLE curations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  class TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments/Feedback table
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  grade TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes table
CREATE TABLE artwork_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(artwork_id, user_id)
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE curations ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_likes ENABLE ROW LEVEL SECURITY;

-- Profiles: public read, own write
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Insert profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Artworks: public read, own write
CREATE POLICY "Public artworks" ON artworks FOR SELECT USING (true);
CREATE POLICY "Create artwork" ON artworks FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Update own artwork" ON artworks FOR UPDATE USING (auth.uid() = creator_id);

-- Assignments: public read, teacher write
CREATE POLICY "Public assignments" ON assignments FOR SELECT USING (true);
CREATE POLICY "Teacher create assignment" ON assignments FOR INSERT WITH CHECK (auth.uid() = teacher_id);

-- Comments: public read, authenticated write
CREATE POLICY "Public comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated comment" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Storage bucket for artworks
INSERT INTO storage.buckets (id, name, public) VALUES ('artworks', 'artworks', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Function to handle new user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ============================================================
-- Code-driven tables that were missing from this schema file
-- (the application reads/writes these in production)
-- ============================================================

-- Teachers table — keyed by auth.users.id
CREATE TABLE IF NOT EXISTS teachers (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  grade       TEXT,
  class       TEXT,
  department  TEXT,
  subject     TEXT,
  photo_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Students table — NISN is the natural primary key (cookie-based auth, not auth.users)
CREATE TABLE IF NOT EXISTS students (
  nisn           TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  grade          TEXT,
  class          TEXT,
  added_by       UUID REFERENCES teachers(id) ON DELETE SET NULL,
  display_name   TEXT,
  bio            TEXT,
  photo_url      TEXT,
  password_hash  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_added_by ON students (added_by);

-- Add class scoping to assignments (Issue 2)
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS class TEXT;
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments (class);

-- Submissions — the work students upload for an assignment
CREATE TABLE IF NOT EXISTS submissions (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nisn           TEXT REFERENCES students(nisn) ON DELETE CASCADE,
  assignment_id  UUID REFERENCES assignments(id) ON DELETE CASCADE,
  file_url       TEXT,
  grade          TEXT,
  feedback       TEXT,
  published      BOOLEAN DEFAULT false,
  submitted_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_nisn          ON submissions (nisn);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions (assignment_id);

-- Feedbacks — teacher comments on a submission (separate from inline grade)
CREATE TABLE IF NOT EXISTS feedbacks (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  submission_id  UUID REFERENCES submissions(id) ON DELETE CASCADE,
  teacher_id     UUID REFERENCES teachers(id) ON DELETE CASCADE,
  comment        TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_submission_id ON feedbacks (submission_id);

-- ============================================================
-- RLS for the code-driven tables
-- ============================================================

ALTER TABLE teachers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE students     ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks    ENABLE ROW LEVEL SECURITY;

-- Teachers — full access to their own row
CREATE POLICY "Teacher reads own row"   ON teachers FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Teacher updates own row" ON teachers FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Teacher inserts own row" ON teachers FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Public read for the navbar dropdown / lookup before login
CREATE POLICY "Public can read teachers for login" ON teachers FOR SELECT TO anon USING (true);

-- Students — teachers can read their own students
CREATE POLICY "Teacher reads own students" ON students
  FOR SELECT TO authenticated
  USING (added_by = auth.uid());

-- Students use cookie-based auth (no auth.uid()), so the application server
-- talks to this table via the service role. Allow service_role free access:
CREATE POLICY "Service role full access on students" ON students
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Login lookup for students (anon needs to verify nisn/password)
CREATE POLICY "Anon can read students for login" ON students
  FOR SELECT TO anon
  USING (true);

-- Assignments — teacher CRUD on their own rows
CREATE POLICY "Teacher reads own assignments"   ON assignments FOR SELECT TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Teacher inserts own assignments" ON assignments FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Teacher updates own assignments" ON assignments FOR UPDATE TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Teacher deletes own assignments" ON assignments FOR DELETE TO authenticated USING (teacher_id = auth.uid());

-- Students can read assignments their teacher posted (via cookie session,
-- so we expose a permissive read for both anon and authenticated)
CREATE POLICY "Anyone can read assignments" ON assignments
  FOR SELECT TO anon, authenticated
  USING (true);

-- Submissions — teachers see submissions tied to their assignments
CREATE POLICY "Teacher reads submissions for own assignments" ON submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM assignments a WHERE a.id = submissions.assignment_id AND a.teacher_id = auth.uid())
  );

CREATE POLICY "Teacher updates submissions for own assignments" ON submissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM assignments a WHERE a.id = submissions.assignment_id AND a.teacher_id = auth.uid())
  );

-- Service role full access for student-side cookie auth
CREATE POLICY "Service role full access on submissions" ON submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read of published submissions (gallery)
CREATE POLICY "Anyone can read published submissions" ON submissions
  FOR SELECT TO anon, authenticated
  USING (published = true);

-- Feedbacks — only the authoring teacher writes; everyone with the submission can read
CREATE POLICY "Teacher inserts own feedbacks" ON feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teacher reads own feedbacks" ON feedbacks
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Service role full access on feedbacks" ON feedbacks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Students can read feedback on their own submissions (server-side via service role)
CREATE POLICY "Anon can read feedbacks" ON feedbacks
  FOR SELECT TO anon
  USING (true);
