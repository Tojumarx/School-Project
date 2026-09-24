-- SQL Schema for Supabase Setup

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'student', -- 'student' or 'supervisor'
  full_name TEXT,
  matric_number TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Logbook Entries Table
CREATE TABLE IF NOT EXISTS public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT,
  student_email TEXT,
  date DATE NOT NULL,
  week_number INT,
  day_of_week TEXT,
  description TEXT NOT NULL,
  equipment_used TEXT,
  skills_acquired TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  supervisor_comment TEXT,
  image_url TEXT,
  location JSONB, -- { latitude: number, longitude: number, address?: string }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Announcements (Broadcasts) Table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  supervisor_name TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_email TEXT,
  receiver_email TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for dev/setup or customize policies as needed:
CREATE POLICY "Allow full access to profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow full access to entries" ON public.entries FOR ALL USING (true);
CREATE POLICY "Allow full access to announcements" ON public.announcements FOR ALL USING (true);
CREATE POLICY "Allow full access to messages" ON public.messages FOR ALL USING (true);
