-- EventX Platform Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the complete database structure.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- DROP TABLES (For a clean reset - Optional)
-- ====================================================================
-- Uncomment the lines below if you want to wipe the database and start fresh.
/*
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS contact_submissions CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_role() CASCADE;
*/

-- ====================================================================
-- CORE TABLES
-- ====================================================================

-- 1. Events Table
-- Includes standard event details + Payment configuration fields
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    event_end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- Registration Control
    registration_open BOOLEAN DEFAULT true,
    registration_start TIMESTAMP WITH TIME ZONE,
    registration_end TIMESTAMP WITH TIME ZONE,
    form_fields JSONB DEFAULT '[]'::jsonb,
    
    -- Payment Gateway Fields (NEW)
    is_paid BOOLEAN DEFAULT FALSE,
    registration_fee NUMERIC DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Participants Table
-- Tracks user registrations + Payment Status
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    responses JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    
    -- Payment Transaction Details (NEW)
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

-- 3. Contact Submissions Table
CREATE TABLE IF NOT EXISTS contact_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Admin Users Table
-- Stores Admin roles, Club details, and Bank Accounts for settlements
CREATE TABLE IF NOT EXISTS admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin', -- 'admin' or 'super_admin'
    
    -- Club Profile
    club_name TEXT,
    club_logo_url TEXT,
    
    -- Bank Details for Payouts (NEW)
    bank_account_no TEXT,
    bank_ifsc TEXT,
    bank_holder_name TEXT,
    bank_name TEXT,
    account_type TEXT, -- 'savings' or 'current'

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT admin_role_check CHECK (role IN ('admin', 'super_admin'))
);

-- 5. Profiles Table (General Users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- HELPER FUNCTION
-- ====================================================================

-- Helper function to get the current authenticated user's admin role
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


-- ====================================================================
-- RLS SETUP (Row Level Security)
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (to ensure clean slate if running on existing DB)
DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Admins can create events" ON events;
DROP POLICY IF EXISTS "Event owners or super admins can update events" ON events;
DROP POLICY IF EXISTS "Event owners or super admins can delete events" ON events;
DROP POLICY IF EXISTS "Participants can be created by authenticated users" ON participants;
DROP POLICY IF EXISTS "Admins can view participants for events they own" ON participants;
DROP POLICY IF EXISTS "Users can view their own participant records" ON participants;
DROP POLICY IF EXISTS "Admins can update participants for events they own" ON participants;
DROP POLICY IF EXISTS "Contact submissions can be created by anyone" ON contact_submissions;
DROP POLICY IF EXISTS "Contact submissions are viewable by admins" ON contact_submissions;
DROP POLICY IF EXISTS "Authenticated users can read their own admin status" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users; 
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create and update their own profile" ON profiles;


-- 1. Events Policies
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

-- 2. Participants Policies
-- Note: Payment Verification API (Server-side) bypasses RLS using Service Role, 
-- so this INSERT policy covers the client-side initiation or free events.
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

-- 3. Contact Submissions Policies
CREATE POLICY "Contact submissions can be created by anyone"
    ON contact_submissions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Contact submissions are viewable by admins"
    ON contact_submissions FOR SELECT
    USING (public.get_admin_role() IS NOT NULL);

-- 4. Admin Users Policies
CREATE POLICY "Authenticated users can read their own admin status"
    ON admin_users FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can update their own profile (including bank details), Super Admins can manage all.
CREATE POLICY "Super admins can manage admin users"
    ON admin_users FOR ALL
    USING (public.get_admin_role() = 'super_admin' OR auth.uid() = user_id) 
    WITH CHECK (public.get_admin_role() = 'super_admin' OR auth.uid() = user_id);

-- 5. Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can create and update their own profile"
    ON profiles FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ====================================================================
-- STORAGE BUCKETS
-- ====================================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('event-banners', 'event-banners', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true) ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Public Access Banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Banners" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Banners" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Logos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Logos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Logos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Logos" ON storage.objects;

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

-- ====================================================================
-- INDEXES
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_reviewed_by ON participants(reviewed_by);

-- End of Setup File