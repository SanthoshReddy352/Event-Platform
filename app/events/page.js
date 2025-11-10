'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation' // Import useRouter
import EventCard from '@/components/EventCard'
import GradientText from '@/components/GradientText'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X } from 'lucide-react' // Import X
import { Button } from '@/components/ui/button' // Import Button
import { parseISO } from 'date-fns' 

// Wrap the main component in Suspense for useSearchParams
export default function EventsPageWrapper() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <EventsPage />
    </Suspense>
  )
}

function EventsPage() {
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')

  // --- START OF MODIFICATION: Get URL parameters ---
  const searchParams = useSearchParams()
  const router = useRouter()
  const clubFilterParam = searchParams.get('club')
  const [clubFilter, setClubFilter] = useState(clubFilterParam || null)
  // --- END OF MODIFICATION ---

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    // Update filter state if URL param changes
    setClubFilter(clubFilterParam || null)
  }, [clubFilterParam])

  useEffect(() => {
    filterEvents()
  }, [searchTerm, filter, events, clubFilter]) // Add clubFilter to dependency array

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events', { cache: 'no-store' })
      const data = await response.json()
      if (data.success) {
        setEvents(data.events)
        setFilteredEvents(data.events)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterEvents = () => {
    let filtered = events
    const now = new Date();

    // --- START OF MODIFICATION: Filter by club ---
    if (clubFilter) {
      filtered = filtered.filter(event => 
        event.club && event.club.club_name === clubFilter
      )
    }
    // --- END OF MODIFICATION ---

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (filter === 'active') {
      filtered = filtered.filter(event => {
        const eventEndDate = event.event_end_date ? parseISO(event.event_end_date) : null;
        const isCompleted = eventEndDate && now > eventEndDate;
        
        return !isCompleted && event.is_active;
      })
    } else if (filter === 'open') {
      filtered = filtered.filter(event => {
        const regStartDate = event.registration_start ? parseISO(event.registration_start) : null;
        const regEndDate = event.registration_end ? parseISO(event.registration_end) : null;
        const eventEndDate = event.event_end_date ? parseISO(event.event_end_date) : null;

        const isCompleted = eventEndDate && now > eventEndDate;
        const isWithinDateRange = regStartDate && regEndDate && now >= regStartDate && now < regEndDate;

        return event.registration_open && isWithinDateRange && !isCompleted;
      })
    }

    setFilteredEvents(filtered)
  }

  // --- START OF MODIFICATION: Handle clearing the club filter ---
  const clearClubFilter = () => {
    setClubFilter(null)
    router.push('/events') // Update URL to remove query param
  }
  // --- END OF MODIFICATION ---

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">
          <GradientText>All Events</GradientText>
        </h1>
        <p className="text-gray-400">Browse and register for our hackathons and tech events</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <Input
            placeholder="Search events..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="open">Registration Open</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* --- START OF MODIFICATION: Show clear filter button --- */}
      {clubFilter && (
        <div className="mb-6 flex justify-start">
          <Button variant="outline" onClick={clearClubFilter} className="bg-brand-red/10 border-brand-red text-brand-orange hover:bg-brand-red/20">
            Filtering by: <strong className="ml-1">{clubFilter}</strong>
            <X size={16} className="ml-2" />
          </Button>
        </div>
      )}
      {/* --- END OF MODIFICATION --- */}


      {/* Events Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>
              {searchTerm || filter !== 'all' || clubFilter
                ? 'No events match your search criteria'
                : 'No events available at the moment'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- START OF MODIFICATION: Added LoadingSpinner component ---
function LoadingSpinner() {
  return (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
    </div>
  );
}
// --- END OF MODIFICATION ---