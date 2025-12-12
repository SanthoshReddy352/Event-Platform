-- ====================================================================
-- AUTO UPDATE EVENT STATUS - REALTIME TRIGGERS
-- ====================================================================
-- This file creates triggers to automatically update:
-- 1. registration_open - based on registration_end date
-- 2. is_active - based on event_end_date
-- ====================================================================

-- ====================================================================
-- 1. Enable Realtime for Events Table (if not already enabled)
-- ====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel 
        WHERE prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime') 
        AND prrelid = 'events'::regclass
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE events;
    END IF;
END $$;

-- ====================================================================
-- 2. Function to Update Event Status Based on Dates
-- ====================================================================
-- This function is called by a trigger and updates:
-- - registration_open to false when registration_end is past
-- - is_active to false when event_end_date is past

CREATE OR REPLACE FUNCTION public.update_event_status_on_change()
RETURNS TRIGGER AS $$
DECLARE
    now_ts TIMESTAMP WITH TIME ZONE := NOW();
    new_registration_open BOOLEAN;
    new_is_active BOOLEAN;
BEGIN
    -- Determine new registration_open status
    IF NEW.registration_end IS NOT NULL AND NEW.registration_end < now_ts THEN
        new_registration_open := false;
    ELSE
        new_registration_open := NEW.registration_open;
    END IF;
    
    -- Determine new is_active status
    IF NEW.event_end_date IS NOT NULL AND NEW.event_end_date < now_ts THEN
        new_is_active := false;
    ELSE
        new_is_active := NEW.is_active;
    END IF;
    
    -- Only update if values actually changed
    IF new_registration_open != NEW.registration_open OR new_is_active != NEW.is_active THEN
        NEW.registration_open := new_registration_open;
        NEW.is_active := new_is_active;
        NEW.updated_at := now_ts;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 3. Function to Batch Update All Events (For Cron Job)
-- ====================================================================
-- This function updates all events where dates have passed.
-- Should be called periodically via pg_cron or Supabase Edge Function.

CREATE OR REPLACE FUNCTION public.update_all_expired_events()
RETURNS TABLE (
    event_id UUID,
    title TEXT,
    registration_closed BOOLEAN,
    event_deactivated BOOLEAN
) AS $$
DECLARE
    now_ts TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Update registration_open for events where registration_end has passed
    -- Also update is_active for events where event_end_date has passed
    RETURN QUERY
    WITH updated_events AS (
        UPDATE events
        SET 
            registration_open = CASE 
                WHEN registration_end IS NOT NULL AND registration_end < now_ts THEN false 
                ELSE registration_open 
            END,
            is_active = CASE 
                WHEN event_end_date IS NOT NULL AND event_end_date < now_ts THEN false 
                ELSE is_active 
            END,
            updated_at = CASE 
                WHEN (registration_end IS NOT NULL AND registration_end < now_ts AND registration_open = true)
                   OR (event_end_date IS NOT NULL AND event_end_date < now_ts AND is_active = true)
                THEN now_ts
                ELSE updated_at
            END
        WHERE 
            (registration_end IS NOT NULL AND registration_end < now_ts AND registration_open = true)
            OR (event_end_date IS NOT NULL AND event_end_date < now_ts AND is_active = true)
        RETURNING 
            id,
            events.title,
            (registration_end IS NOT NULL AND registration_end < now_ts) as registration_was_closed,
            (event_end_date IS NOT NULL AND event_end_date < now_ts) as event_was_deactivated
    )
    SELECT 
        updated_events.id,
        updated_events.title,
        updated_events.registration_was_closed,
        updated_events.event_was_deactivated
    FROM updated_events;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 4. Create Trigger for Insert/Update Operations
-- ====================================================================
-- This ensures status is correct whenever an event is created or modified

DROP TRIGGER IF EXISTS trigger_update_event_status ON events;
CREATE TRIGGER trigger_update_event_status
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_event_status_on_change();

-- ====================================================================
-- 5. Grant Execute Permission for the Batch Update Function
-- ====================================================================
-- Allow authenticated users and service_role to call the batch update

GRANT EXECUTE ON FUNCTION public.update_all_expired_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_all_expired_events() TO service_role;

-- ====================================================================
-- 6. Initial Run - Update All Existing Events
-- ====================================================================
-- Run the batch update immediately to fix any events with past dates

SELECT * FROM public.update_all_expired_events();

-- ====================================================================
-- USAGE NOTES:
-- ====================================================================
-- 
-- For automatic periodic updates, you have two options:
--
-- OPTION 1: Supabase pg_cron Extension (Recommended)
-- Run this to create a cron job that updates events every minute:
--
-- SELECT cron.schedule(
--     'update-expired-events',
--     '* * * * *',  -- Every minute
--     $$SELECT public.update_all_expired_events()$$
-- );
--
-- To check if cron is available: SELECT * FROM cron.job;
-- To unschedule: SELECT cron.unschedule('update-expired-events');
--
-- OPTION 2: Call from your application periodically
-- You can call this function from a Supabase Edge Function or
-- a Next.js API route that runs on a schedule.
--
-- Example API call:
-- await supabase.rpc('update_all_expired_events');
--
-- ====================================================================
