import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EventsListClient from './EventsListClient'
import LastWordGradientText from '@/components/LastWordGradientText'


export default async function RegisteredEventsPage() {
  const supabase = createClient()

  // 1. Get User
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // 2. Fetch Participations
  const { data: participations, error: partError } = await supabase
    .from('participants')
    .select('event_id')
    .eq('user_id', user.id)

  if (partError) {
    console.error('Error fetching participations:', partError)
    // Handle error appropriately, maybe show empty state
  }

  if (!participations || participations.length === 0) {
    return <PageContent upcomingEvents={[]} pastEvents={[]} />
  }

  const eventIds = participations.map(p => p.event_id)

  // 3. Fetch Events
  const { data: eventsData, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .in('id', eventIds)
    .order('event_date', { ascending: true })

  if (eventsError) {
    console.error('Error fetching events:', eventsError)
    return <PageContent upcomingEvents={[]} pastEvents={[]} />
  }

  // 4. Fetch Club Info
  const creatorIds = [...new Set(eventsData.map(e => e.created_by))]
  
  const { data: clubsData, error: clubsError } = await supabase
    .from('admin_users')
    .select('user_id, club_name, club_logo_url')
    .in('user_id', creatorIds)

  // 5. Merge Data
  const mergedEvents = eventsData.map(event => {
      const club = clubsData?.find(c => c.user_id === event.created_by)
      return { ...event, club }
  })

  // 6. Split into Upcoming and Past
  const now = new Date()
  const upcomingEvents = mergedEvents.filter(e => {
    const endDate = e.event_end_date ? new Date(e.event_end_date) : null
    const startDate = e.event_date ? new Date(e.event_date) : null
    
    // If event has end date, check if it's in future
    if (endDate) return endDate >= now
    // If only start date, check if it's roughly today or future (simple check)
    if (startDate) return startDate >= now
    return false // Fallback
  })

  const pastEvents = mergedEvents.filter(e => !upcomingEvents.includes(e))

  return <PageContent upcomingEvents={upcomingEvents} pastEvents={pastEvents} />
}

import EventStatsSidebar from './EventStatsSidebar'

function PageContent({ upcomingEvents, pastEvents }) {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          <LastWordGradientText>My Registered Events</LastWordGradientText>
        </h1>
        <p className="text-gray-400">
          You have <span className="text-brand-red font-semibold">{upcomingEvents.length} upcoming</span> event{upcomingEvents.length !== 1 && 's'} scheduled.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content - Event List */}
        <div className="lg:col-span-8 w-full">
            <EventsListClient upcomingEvents={upcomingEvents} pastEvents={pastEvents} />
        </div>

        {/* Right Sidebar - Stats & Dashboard */}
        <div className="lg:col-span-4 w-full sticky top-24">
            <EventStatsSidebar upcomingEvents={upcomingEvents} pastEvents={pastEvents} />
        </div>
      </div>
    </div>
  )
}