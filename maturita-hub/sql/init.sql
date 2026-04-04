-- MaturitaHub 2026 - Database Initialization Script

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    current_status TEXT DEFAULT 'available', -- 'available', 'studying', 'break'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Matura Topics (Social Version)
CREATE TABLE IF NOT EXISTS matura_topics (
    id TEXT PRIMARY KEY,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL means System
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'czech', 'it', 'math', etc.
    description TEXT,
    content TEXT DEFAULT '', -- Markdown format
    icon TEXT DEFAULT '📚',
    is_public BOOLEAN DEFAULT true,
    flashcards JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Matura Topic Progress (Personal to each user)
CREATE TABLE IF NOT EXISTS matura_topic_progress (
    topic_id TEXT REFERENCES matura_topics(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'none', -- 'none', 'started', 'done'
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (topic_id, user_id)
);

-- 4. Matura Streaks & Achievements
CREATE TABLE IF NOT EXISTS matura_streaks (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 0,
    max_streak INT DEFAULT 0,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Global/Shared Studovna Activity (Realtime target)
CREATE TABLE IF NOT EXISTS study_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'pomodoro', 'reading', 'quiz'
    topic_id TEXT REFERENCES matura_topics(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE 
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matura_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE matura_topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE matura_streaks ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for Topics
CREATE POLICY "Public topics are viewable by everyone." ON matura_topics FOR SELECT USING (is_public = true OR auth.uid() = author_id);
CREATE POLICY "Users can create topics." ON matura_topics FOR INSERT WITH CHECK (auth.uid() = author_id OR author_id IS NULL);
CREATE POLICY "Users can update own or system topics." ON matura_topics FOR UPDATE USING (auth.uid() = author_id OR author_id IS NULL);

-- Policies for Progress
-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (new.id, split_part(new.email, '@', 1), 'https://ui-avatars.com/api/?name=' || split_part(new.email, '@', 1) || '&background=5865F2&color=fff');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
