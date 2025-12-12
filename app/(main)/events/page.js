import { createClient } from '@/lib/supabase/server';
import EventsListClient from './EventsListClient';
import { parseISO } from 'date-fns';

export default async function EventsPage({ searchParams }) {
  const supabase = createClient();
  const search = searchParams?.search || '';
  const filter = searchParams?.filter || 'all';
  const clubFilter = searchParams?.club || '';

  // 1. Parallel Fetching (Mirroring Home Page Logic)
  const eventsPromise = supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  const clubsPromise = supabase.rpc('get_public_clubs');

  const [eventsResult, clubsResult] = await Promise.all([eventsPromise, clubsPromise]);

  const rawEvents = eventsResult.data || [];
  const clubsData = clubsResult.data || [];

  // 2. Map Clubs to Events (Manual Join)
  const clubMap = new Map(clubsData.map(c => [c.user_id, c]));

  const events = rawEvents.map(event => ({
    ...event,
    club: clubMap.get(event.created_by) || null
  }));

  // Get unique clubs for the filter dropdown
  const clubs = [...new Set(events?.map(e => e.club?.club_name).filter(Boolean))].sort();

  // Helper: Check event status
  const getEventStatusCategory = (event) => {
    const now = new Date();
    const eventEndDate = event.event_end_date ? parseISO(event.event_end_date) : null;
    const regStartDate = event.registration_start ? parseISO(event.registration_start) : null;
    const regEndDate = event.registration_end ? parseISO(event.registration_end) : null;

    const isCompleted = eventEndDate && now > eventEndDate;

    if (isCompleted) return 'completed';
    
    // "Open" logic: Registration is open and within dates
    const isWithinRegDate = regStartDate && regEndDate && now >= regStartDate && now < regEndDate;
    if (event.registration_open && (isWithinRegDate || (!regStartDate && !regEndDate))) {
      return 'open';
    }

    // "Active" logic: Not completed and is marked active (could be registration closed but event not over)
    if (event.is_active && !isCompleted) return 'active'; // Broad category for active events

    return 'other';
  };

  // 1. Filter Logic
  let filteredEvents = events || [];

  // Filter by Search Term
  if (search) {
    const term = search.toLowerCase();
    filteredEvents = filteredEvents.filter(event => 
      event.title.toLowerCase().includes(term) ||
      event.description?.toLowerCase().includes(term)
    );
  }

  // Filter by Club
  if (clubFilter) {
    // Aggressive normalization: remove non-alphanumeric chars and lowercase
    // This handles cases like "IEEE Computer Society" vs "ieee-computer-society" vs "IEEE%20Computer%20Society"
    // Aggressive normalization: remove non-alphanumeric chars and lowercase
    const normalize = (str) => str ? decodeURIComponent(str).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const target = normalize(clubFilter);

    filteredEvents = filteredEvents.filter(event => {
      const rawClubName = event.club?.club_name;
      const clubName = normalize(rawClubName);
      
      const match = clubName.includes(target);
      
      // console.log(`[Event Debug] ID: ${event.id}, Club Raw: "${rawClubName}", Normalized: "${clubName}", Match: ${match}`);
      
      return match; 
    });
  }

  // Filter by Status Category
  if (filter === 'active') {
    // Show only active, non-completed events
    filteredEvents = filteredEvents.filter(event => {
       const status = getEventStatusCategory(event);
       return event.is_active && status !== 'completed';
    });
  } else if (filter === 'open') {
    filteredEvents = filteredEvents.filter(event => getEventStatusCategory(event) === 'open');
  } else if (filter === 'completed') {
    filteredEvents = filteredEvents.filter(event => getEventStatusCategory(event) === 'completed');
  }
  // 'all' includes everything fetched (which might be everything in DB depending on RLS/Query, 
  // but if we want to hide inactive ones by default unless 'all' is strictly "Active Events", 
  // we might want to default to is_active=true. 
  // However, mimicking previous logic: "all" meant "all active".
  if (filter === 'all' || !filter) {
      // Default view: usually we don't show "Inactive/Archived" unless specifically asked, 
      // but let's stick to the previous page logic which had .eq('is_active', true).
      // If the user wants to see *truly* everything including historical non-active, we'd need another flag.
      // For now, let's assume 'all' means 'all public/active' events.
      // But wait, the previous code fetched .eq('is_active', true).
      // And the client side had a filter for 'completed' which implies completed events ARE active in the DB?
      // Let's assume we want to show everything that is 'publicly visible' (is_active=true).
      
      filteredEvents = filteredEvents.filter(e => e.is_active);
  }

  // 2. Sort Logic (Server Side)
  // Put active/upcoming first, completed last.
  const isEventCompleted = (event) => {
    const now = new Date();
    const eventEndDate = event.event_end_date ? parseISO(event.event_end_date) : null;
    return eventEndDate && now > eventEndDate;
  };

  filteredEvents.sort((a, b) => {
    const aCompleted = isEventCompleted(a);
    const bCompleted = isEventCompleted(b);

    if (aCompleted && !bCompleted) return 1;
    if (!aCompleted && bCompleted) return -1;
    
    // Secondary sort: Closest event date first for active, most recent first for completed?
    // Original logic just kept DB order (created_at desc).
    return 0; 
  });


  return (
    <EventsListClient 
      initialEvents={filteredEvents}
      clubs={clubs}
    />
  );
}