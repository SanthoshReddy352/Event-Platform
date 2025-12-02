-- ====================================================================
-- EVENT PLATFORM - COMPLETE DATABASE SETUP
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 2. CORE TABLES
-- ====================================================================

-- A. Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    event_end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    event_type TEXT DEFAULT 'other',
    registration_open BOOLEAN DEFAULT true,
    registration_start TIMESTAMP WITH TIME ZONE,
    registration_end TIMESTAMP WITH TIME ZONE,
    form_fields JSONB DEFAULT '[]'::jsonb,
    is_paid BOOLEAN DEFAULT FALSE,
    registration_fee NUMERIC DEFAULT 0,
    problem_selection_start TIMESTAMP WITH TIME ZONE,
    problem_selection_end TIMESTAMP WITH TIME ZONE,
    ppt_template_url TEXT,
    ppt_release_time TIMESTAMP WITH TIME ZONE,
    submission_start TIMESTAMP WITH TIME ZONE,
    submission_end TIMESTAMP WITH TIME ZONE,
    submission_form_fields JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- B. Problem Statements Table
CREATE TABLE IF NOT EXISTS problem_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    max_selections INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- C. Participants Table
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    responses JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    selected_problem_id UUID REFERENCES problem_statements(id),
    submission_data JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE,
    payment_id TEXT,
    order_id TEXT,
    payment_status TEXT DEFAULT 'pending',
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT participant_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- D. Contact Submissions Table
CREATE TABLE IF NOT EXISTS contact_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- E. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin',
    club_name TEXT,
    club_logo_url TEXT,
    razorpay_key_id TEXT,
    razorpay_key_secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT admin_role_check CHECK (role IN ('admin', 'super_admin'))
);

-- F. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 3. HELPER FUNCTIONS
-- ====================================================================

-- Function to get the current authenticated user's admin role
CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS TEXT AS $$
DECLARE
  admin_role TEXT;
BEGIN
  SELECT role INTO admin_role
  FROM public.admin_users
  WHERE user_id = auth.uid();
  RETURN admin_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check and Select Problem (Concurrency Safe)
CREATE OR REPLACE FUNCTION check_and_select_problem(p_user_id UUID, p_event_id UUID, p_problem_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    max_limit INTEGER;
    existing_selection UUID;
BEGIN
    SELECT selected_problem_id INTO existing_selection
    FROM participants
    WHERE user_id = p_user_id AND event_id = p_event_id;

    IF existing_selection IS NOT NULL THEN
        RAISE EXCEPTION 'You have already selected a problem statement.';
    END IF;

    SELECT count(*) INTO current_count
    FROM participants
    WHERE selected_problem_id = p_problem_id;

    SELECT max_selections INTO max_limit
    FROM problem_statements
    WHERE id = p_problem_id;

    IF current_count >= max_limit THEN
        RETURN FALSE;
    END IF;

    UPDATE participants
    SET selected_problem_id = p_problem_id
    WHERE user_id = p_user_id AND event_id = p_event_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Function for RLS to prevent recursion
CREATE OR REPLACE FUNCTION public.is_event_participant(_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM participants
    WHERE event_id = _event_id
    AND user_id = auth.uid()
  );
END;
$$;

-- [NEW] PERFORMANCE FIX: Fast Participant Counting
-- This replaces the slow JavaScript loop in your API
CREATE OR REPLACE FUNCTION get_event_participant_counts(event_ids uuid[])
RETURNS TABLE (event_id uuid, approved_count bigint)
LANGUAGE sql
AS $$
  SELECT event_id, count(*) as approved_count
  FROM participants
  WHERE status = 'approved'
  AND event_id = ANY(event_ids)
  GROUP BY event_id;
$$;

-- ====================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Admins can create events" ON events;
DROP POLICY IF EXISTS "Event owners or super admins can update events" ON events;
DROP POLICY IF EXISTS "Event owners or super admins can delete events" ON events;
DROP POLICY IF EXISTS "Public read problem statements" ON problem_statements;
DROP POLICY IF EXISTS "Admins manage problem statements" ON problem_statements;
DROP POLICY IF EXISTS "Participants can be created by authenticated users" ON participants;
DROP POLICY IF EXISTS "Admins can view participants for events they own" ON participants;
DROP POLICY IF EXISTS "Users can view their own participant records" ON participants;
DROP POLICY IF EXISTS "Participants can view event peers" ON participants;
DROP POLICY IF EXISTS "Admins can update participants for events they own" ON participants;
DROP POLICY IF EXISTS "Participants can update their own record" ON participants;
DROP POLICY IF EXISTS "Contact submissions can be created by anyone" ON contact_submissions;
DROP POLICY IF EXISTS "Contact submissions are viewable by admins" ON contact_submissions;
DROP POLICY IF EXISTS "Authenticated users can read their own admin status" ON admin_users;
DROP POLICY IF EXISTS "Admins can update their own profile" ON admin_users;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create and update their own profile" ON profiles;

-- Events Policies
CREATE POLICY "Events are viewable by everyone" ON events FOR SELECT USING (true);
CREATE POLICY "Admins can create events" ON events FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND public.get_admin_role() IS NOT NULL);
CREATE POLICY "Event owners or super admins can update events" ON events FOR UPDATE USING (public.get_admin_role() = 'super_admin' OR created_by = auth.uid());
CREATE POLICY "Event owners or super admins can delete events" ON events FOR DELETE USING (public.get_admin_role() = 'super_admin' OR created_by = auth.uid());

-- Problem Statements Policies
CREATE POLICY "Public read problem statements" ON problem_statements FOR SELECT USING (true);
CREATE POLICY "Admins manage problem statements" ON problem_statements FOR ALL USING (public.get_admin_role() IS NOT NULL);

-- Participants Policies
CREATE POLICY "Participants can be created by authenticated users" ON participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Participants can view event peers" ON participants FOR SELECT USING (
    (public.get_admin_role() IS NOT NULL) OR
    (user_id = auth.uid()) OR
    (public.is_event_participant(event_id))
);
CREATE POLICY "Admins can update participants for events they own" ON participants FOR UPDATE USING (
    (public.get_admin_role() = 'super_admin') OR
    (EXISTS (SELECT 1 FROM events WHERE events.id = participants.event_id AND events.created_by = auth.uid()))
);
CREATE POLICY "Participants can update their own record" ON participants FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Contact & Admin Policies
CREATE POLICY "Contact submissions can be created by anyone" ON contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Contact submissions are viewable by admins" ON contact_submissions FOR SELECT USING (public.get_admin_role() IS NOT NULL);
CREATE POLICY "Authenticated users can read their own admin status" ON admin_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can update their own profile" ON admin_users FOR UPDATE USING (public.get_admin_role() = 'super_admin' OR auth.uid() = user_id) WITH CHECK (public.get_admin_role() = 'super_admin' OR auth.uid() = user_id);
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can create and update their own profile" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ====================================================================
-- 5. REALTIME & STORAGE
-- ====================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_rel WHERE prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime') AND prrelid = 'participants'::regclass) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE participants;
    END IF;
END $$;

INSERT INTO storage.buckets (id, name, public) VALUES ('event-banners', 'event-banners', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('ppt-templates', 'ppt-templates', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', false) ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access Banners" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Logos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access PPT" ON storage.objects;
DROP POLICY IF EXISTS "Participants can upload submissions" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Objects" ON storage.objects;

CREATE POLICY "Public Access Banners" ON storage.objects FOR SELECT USING (bucket_id = 'event-banners');
CREATE POLICY "Public Access Logos" ON storage.objects FOR SELECT USING (bucket_id = 'club-logos');
CREATE POLICY "Public Access PPT" ON storage.objects FOR SELECT USING (bucket_id = 'ppt-templates');
CREATE POLICY "Participants can upload submissions" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'submissions' AND auth.uid() = owner);
CREATE POLICY "Admins can view submissions" ON storage.objects FOR SELECT USING (bucket_id = 'submissions' AND public.get_admin_role() IS NOT NULL);
CREATE POLICY "Users can view own submissions" ON storage.objects FOR SELECT USING (bucket_id = 'submissions' AND auth.uid() = owner);
CREATE POLICY "Admin Upload Objects" ON storage.objects FOR INSERT WITH CHECK (public.get_admin_role() IS NOT NULL);
CREATE POLICY "Admin Update Objects" ON storage.objects FOR UPDATE USING (public.get_admin_role() IS NOT NULL);
CREATE POLICY "Admin Delete Objects" ON storage.objects FOR DELETE USING (public.get_admin_role() IS NOT NULL);

-- ====================================================================
-- 7. INDEXES & TRIGGERS
-- ====================================================================
-- Single Column Indexes
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);

-- [NEW] Composite Indexes for Query Optimization
CREATE INDEX IF NOT EXISTS idx_participants_event_user ON participants(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_participants_status_event ON participants(status, event_id);
CREATE INDEX IF NOT EXISTS idx_events_active_created ON events(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone_number)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', null);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();