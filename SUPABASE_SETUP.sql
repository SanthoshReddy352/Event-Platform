-- EventX Platform Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the complete database structure.

-- ====================================================================
-- 1. INITIAL SETUP
-- ====================================================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 2. CORE TABLES
-- ====================================================================

-- A. Events Table
-- Includes standard details, Payment config, and Hackathon Scope fields
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    event_end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- Event Scope Configuration
    event_type TEXT DEFAULT 'other', -- 'hackathon', 'mcq', 'other'
    
    -- Registration Control
    registration_open BOOLEAN DEFAULT true,
    registration_start TIMESTAMP WITH TIME ZONE,
    registration_end TIMESTAMP WITH TIME ZONE,
    form_fields JSONB DEFAULT '[]'::jsonb,
    
    -- Payment Gateway Fields
    is_paid BOOLEAN DEFAULT FALSE,
    registration_fee NUMERIC DEFAULT 0,

    -- Hackathon Scope: Specific Timings & URLs
    problem_selection_start TIMESTAMP WITH TIME ZONE,
    problem_selection_end TIMESTAMP WITH TIME ZONE,
    ppt_template_url TEXT,         -- URL to the admin-uploaded template
    ppt_release_time TIMESTAMP WITH TIME ZONE,
    submission_start TIMESTAMP WITH TIME ZONE,
    submission_end TIMESTAMP WITH TIME ZONE,
    submission_form_fields JSONB DEFAULT '[]'::jsonb, -- Separate from registration form

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- B. Problem Statements Table (New for Hackathon Scope)
-- Stores the challenges/problems participants can select
CREATE TABLE IF NOT EXISTS problem_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    max_selections INTEGER DEFAULT 1, -- Maximum number of teams/participants that can select this
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- C. Participants Table
-- Tracks user registrations, Payment Status, and Hackathon progress
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    responses JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    
    -- Hackathon Scope: Progress Tracking
    selected_problem_id UUID REFERENCES problem_statements(id),
    submission_data JSONB,         -- Stores the answers to the final submission form
    submitted_at TIMESTAMP WITH TIME ZONE,

    -- Payment Transaction Details
    payment_id TEXT,               -- Razorpay Payment ID
    order_id TEXT,                 -- Razorpay Order ID
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    
    -- Admin Review Details
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
-- Stores Admin roles, Club details, and Club's OWN Razorpay Keys
CREATE TABLE IF NOT EXISTS admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin', -- 'admin' or 'super_admin'
    
    -- Club Profile
    club_name TEXT,
    club_logo_url TEXT,
    
    -- Razorpay API Keys (The Club's Own Keys)
    razorpay_key_id TEXT, 
    razorpay_key_secret TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT admin_role_check CHECK (role IN ('admin', 'super_admin'))
);

-- F. Profiles Table (General Users)
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
-- Ensures limits are enforced even if multiple users click at the exact same moment
CREATE OR REPLACE FUNCTION check_and_select_problem(p_user_id UUID, p_event_id UUID, p_problem_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    max_limit INTEGER;
    existing_selection UUID;
BEGIN
    -- 1. Check if user already selected a problem for this event
    SELECT selected_problem_id INTO existing_selection
    FROM participants
    WHERE user_id = p_user_id AND event_id = p_event_id;

    IF existing_selection IS NOT NULL THEN
        RAISE EXCEPTION 'You have already selected a problem statement.';
    END IF;

    -- 2. Check current count for the requested problem
    SELECT count(*) INTO current_count
    FROM participants
    WHERE selected_problem_id = p_problem_id;

    -- 3. Get the limit
    SELECT max_selections INTO max_limit
    FROM problem_statements
    WHERE id = p_problem_id;

    -- 4. Validate
    IF current_count >= max_limit THEN
        RETURN FALSE; -- Limit reached
    END IF;

    -- 5. Update the participant record
    UPDATE participants
    SET selected_problem_id = p_problem_id
    WHERE user_id = p_user_id AND event_id = p_event_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- CLEANUP: Drop existing policies to avoid conflicts during re-runs
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Admins can create events" ON events;
DROP POLICY IF EXISTS "Event owners or super admins can update events" ON events;
DROP POLICY IF EXISTS "Event owners or super admins can delete events" ON events;

DROP POLICY IF EXISTS "Public read problem statements" ON problem_statements;
DROP POLICY IF EXISTS "Admins manage problem statements" ON problem_statements;

DROP POLICY IF EXISTS "Participants can be created by authenticated users" ON participants;
DROP POLICY IF EXISTS "Admins can view participants for events they own" ON participants;
DROP POLICY IF EXISTS "Users can view their own participant records" ON participants;
DROP POLICY IF EXISTS "Admins can update participants for events they own" ON participants;

DROP POLICY IF EXISTS "Contact submissions can be created by anyone" ON contact_submissions;
DROP POLICY IF EXISTS "Contact submissions are viewable by admins" ON contact_submissions;
DROP POLICY IF EXISTS "Authenticated users can read their own admin status" ON admin_users;
DROP POLICY IF EXISTS "Admins can update their own profile" ON admin_users; 
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create and update their own profile" ON profiles;

-- A. Events Policies
CREATE POLICY "Events are viewable by everyone"
    ON events FOR SELECT
    USING (true);

CREATE POLICY "Admins can create events"
    ON events FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND public.get_admin_role() IS NOT NULL);

CREATE POLICY "Event owners or super admins can update events"
    ON events FOR UPDATE
    USING (public.get_admin_role() = 'super_admin' OR created_by = auth.uid());

CREATE POLICY "Event owners or super admins can delete events"
    ON events FOR DELETE
    USING (public.get_admin_role() = 'super_admin' OR created_by = auth.uid());

-- B. Problem Statements Policies
CREATE POLICY "Public read problem statements" 
    ON problem_statements FOR SELECT 
    USING (true);

CREATE POLICY "Admins manage problem statements" 
    ON problem_statements FOR ALL 
    USING (public.get_admin_role() IS NOT NULL);

-- C. Participants Policies
CREATE POLICY "Participants can be created by authenticated users"
    ON participants FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view participants for events they own"
    ON participants FOR SELECT
    USING (
        (public.get_admin_role() = 'super_admin') OR
        (EXISTS (
            SELECT 1 FROM events
            WHERE events.id = participants.event_id AND events.created_by = auth.uid()
        ))
    );

CREATE POLICY "Users can view their own participant records"
    ON participants FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can update participants for events they own"
    ON participants FOR UPDATE
    USING (
        (public.get_admin_role() = 'super_admin') OR
        (EXISTS (
            SELECT 1 FROM events
            WHERE events.id = participants.event_id AND events.created_by = auth.uid()
        ))
    );

-- D. Contact Submissions Policies
CREATE POLICY "Contact submissions can be created by anyone"
    ON contact_submissions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Contact submissions are viewable by admins"
    ON contact_submissions FOR SELECT
    USING (public.get_admin_role() IS NOT NULL);

-- E. Admin Users Policies
CREATE POLICY "Authenticated users can read their own admin status"
    ON admin_users FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can update their own profile"
    ON admin_users FOR UPDATE
    USING (public.get_admin_role() = 'super_admin' OR auth.uid() = user_id)
    WITH CHECK (public.get_admin_role() = 'super_admin' OR auth.uid() = user_id);

-- F. Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can create and update their own profile"
    ON profiles FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ====================================================================
-- 5. STORAGE BUCKETS
-- ====================================================================

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('event-banners', 'event-banners', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('ppt-templates', 'ppt-templates', true) ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies to avoid conflicts (Cleanup)
DROP POLICY IF EXISTS "Public Access Banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Banners" ON storage.objects;

DROP POLICY IF EXISTS "Public Access Logos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Logos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Logos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Logos" ON storage.objects;

DROP POLICY IF EXISTS "Public Access PPT" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload PPT" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update PPT" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete PPT" ON storage.objects;

-- Policies for event-banners
CREATE POLICY "Public Access Banners" ON storage.objects FOR SELECT USING (bucket_id = 'event-banners');
CREATE POLICY "Admin Upload Banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-banners' AND public.get_admin_role() IS NOT NULL);
CREATE POLICY "Admin Update Banners" ON storage.objects FOR UPDATE USING (bucket_id = 'event-banners' AND public.get_admin_role() IS NOT NULL);
CREATE POLICY "Admin Delete Banners" ON storage.objects FOR DELETE USING (bucket_id = 'event-banners' AND public.get_admin_role() IS NOT NULL);

-- Policies for club-logos
CREATE POLICY "Public Access Logos" ON storage.objects FOR SELECT USING (bucket_id = 'club-logos');
CREATE POLICY "Admin Upload Logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'club-logos' AND public.get_admin_role() IS NOT NULL);
CREATE POLICY "Admin Update Logos" ON storage.objects FOR UPDATE USING (bucket_id = 'club-logos' AND public.get_admin_role() IS NOT NULL);
CREATE POLICY "Admin Delete Logos" ON storage.objects FOR DELETE USING (bucket_id = 'club-logos' AND public.get_admin_role() IS NOT NULL);

-- Policies for ppt-templates
CREATE POLICY "Public Access PPT" ON storage.objects FOR SELECT USING (bucket_id = 'ppt-templates');
CREATE POLICY "Admin Upload PPT" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ppt-templates' AND public.get_admin_role() IS NOT NULL);
CREATE POLICY "Admin Update PPT" ON storage.objects FOR UPDATE USING (bucket_id = 'ppt-templates' AND public.get_admin_role() IS NOT NULL);
CREATE POLICY "Admin Delete PPT" ON storage.objects FOR DELETE USING (bucket_id = 'ppt-templates' AND public.get_admin_role() IS NOT NULL);

-- ====================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_problem_statements_event_id ON problem_statements(event_id);