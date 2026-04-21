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
