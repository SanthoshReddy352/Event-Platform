
import { createClient, supabaseAdmin } from '@/lib/supabase/server';
import HomeClient from './HomeClient';
import { parseISO } from 'date-fns';

export const metadata = {
  title: 'EventX - Campus Event Hub',
  description: 'Discover and manage hackathons, workshops, and tech events from all clubs on campus.',
};

export const revalidate = 0;

export default async function Home() {
  // Use supabaseAdmin to bypass RLS for fetching public club data
  // Fallback to createClient() if admin key not configured (though it should be)
  const supabase = supabaseAdmin || createClient();

  // 1. Parallel Fetching for Performance
  const eventsPromise = supabase
    .from('events')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Use RPC to bypass RLS for fetching public club data
  const clubsPromise = supabase.rpc('get_public_clubs');

  const [eventsResult, clubsResult] = await Promise.all([eventsPromise, clubsPromise]);

  const eventsData = eventsResult.data || [];
  const clubsData = clubsResult.data || [];

  // 2. Map Clubs to Events (Manual Join)
  // This resolves the issue where 'created_by' references auth.users, not admin_users
  const clubMap = new Map(clubsData.map(c => [c.user_id, c]));

  const enrichedEvents = eventsData.map(event => ({
    ...event,
    club: clubMap.get(event.created_by) || null
  }));

  // 3. Filter Upcoming/Open Events
  const now = new Date();
  
  const upcomingEvents = enrichedEvents.filter((event) => {
    // Must be active and open for registration
    if (!event.is_active || !event.registration_open) return false;

    // Check completion (if end date exists)
    const eventEnd = event.event_end_date ? parseISO(event.event_end_date) : null;
    if (eventEnd && now > eventEnd) return false;

    // Check registration start (if start date exists)
    const regStart = event.registration_start ? parseISO(event.registration_start) : null;
    if (regStart && now < regStart) return false;

    return true;
  }).slice(0, 3); // Take top 3

  // 4. Uniquify Clubs for the "Browse by Club" section
  // Filter out duplicates based on club_name
  const uniqueClubs = [
      ...new Map(clubsData.map((club) => [club.club_name, club])).values()
  ].sort((a, b) => a.club_name.localeCompare(b.club_name));

  return <HomeClient upcomingEvents={upcomingEvents} clubs={uniqueClubs} />;
}