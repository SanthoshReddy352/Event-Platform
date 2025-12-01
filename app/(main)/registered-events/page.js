// app/(main)/registered-events/page.js
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
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect if not logged in and auth check is done
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function fetchRegisteredEvents() {
      if (!user) return;
      
      setLoading(true)
      try {
        // 1. Get IDs of events the user is participating in
        const { data: participations, error: partError } = await supabase
          .from('participants')
          .select('event_id')
          .eq('user_id', user.id);

        if (partError) throw partError;

        if (!participations || participations.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }

        const eventIds = participations.map(p => p.event_id);

        // 2. Fetch the actual event details
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds)
          .order('event_date', { ascending: true }); // Show upcoming first

        if (eventsError) throw eventsError;

        // 3. Fetch club details (creators) manually to populate the EventCard 'club' prop
        // The 'events' table links to 'admin_users' via 'created_by' = 'user_id'
        const creatorIds = [...new Set(eventsData.map(e => e.created_by))];
        
        const { data: clubsData, error: clubsError } = await supabase
          .from('admin_users')
          .select('user_id, club_name, club_logo_url')
          .in('user_id', creatorIds);

        if (clubsError) throw clubsError;

        // 4. Merge club data into events
        const mergedEvents = eventsData.map(event => {
            const club = clubsData.find(c => c.user_id === event.created_by);
            return { ...event, club };
        });

        setEvents(mergedEvents);

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