'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import EventCard from '@/components/EventCard'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import LastWordGradientText from '@/components/LastWordGradientText'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'

export default function RegisteredEventsPage() {
  const STORAGE_KEY = 'registeredEvents';

  // 1. Initialize events from sessionStorage if available
  const [events, setEvents] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    }
    return [];
  });

  // 2. Only show loading initially if we DON'T have data in storage
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem(STORAGE_KEY);
    }
    return true;
  });

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function fetchRegisteredEvents() {
      if (!user) return;
      
      // Note: We DO NOT set loading(true) here. 
      // This allows the cached data to show while we fetch updates in the background.
      
      try {
        const { data: participations, error: partError } = await supabase
          .from('participants')
          .select('event_id')
          .eq('user_id', user.id);

        if (partError) throw partError;

        if (!participations || participations.length === 0) {
          setEvents([]);
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify([])); // Save empty state
          setLoading(false);
          return;
        }

        const eventIds = participations.map(p => p.event_id);

        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds)
          .order('event_date', { ascending: true });

        if (eventsError) throw eventsError;

        const creatorIds = [...new Set(eventsData.map(e => e.created_by))];
        
        const { data: clubsData, error: clubsError } = await supabase
          .from('admin_users')
          .select('user_id, club_name, club_logo_url')
          .in('user_id', creatorIds);

        if (clubsError) throw clubsError;

        const mergedEvents = eventsData.map(event => {
            const club = clubsData.find(c => c.user_id === event.created_by);
            return { ...event, club };
        });

        setEvents(mergedEvents);
        // 3. Save the fresh data to sessionStorage
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mergedEvents));

      } catch (error) {
        console.error('Error fetching registered events:', error.message);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
        fetchRegisteredEvents();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="text-center py-24">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-red" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">
          <LastWordGradientText>My Registered Events</LastWordGradientText>
        </h1>
        <p className="text-gray-400">Manage and view details for events you have joined.</p>
      </div>

      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>You haven't registered for any events yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}