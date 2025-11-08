'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import EventCard from '@/components/EventCard'
import { Calendar, Users, Trophy, Zap, Building } from 'lucide-react' // Import Building

export default function Home() {
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loading, setLoading] = useState(true)
  
  // --- START OF MODIFICATION ---
  const [clubs, setClubs] = useState([])
  const [loadingClubs, setLoadingClubs] = useState(true)
  // --- END OF MODIFICATION ---

  useEffect(() => {
    fetchUpcomingEvents()
    fetchClubs() // Fetch clubs on load
  }, [])

  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch('/api/events?active=true&limit=3')
      const data = await response.json()
      if (data.success) {
        setUpcomingEvents(data.events)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  // --- START OF MODIFICATION: Add fetchClubs ---
  const fetchClubs = async () => {
    try {
      const response = await fetch('/api/clubs');
      const data = await response.json();
      if (data.success) {
        // Ensure clubs are unique by name
        const uniqueClubs = data.clubs.reduce((acc, club) => {
           if (!acc.find(item => item.club_name === club.club_name)) {
              acc.push(club);
           }
           return acc;
        }, []);
        setClubs(uniqueClubs);
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoadingClubs(false);
    }
  }
  // --- END OF MODIFICATION ---


  return (
    <div>
      {/* Hero Section (Unchanged) */}
      <section className="bg-gradient-to-br from-[#00629B] to-[#004d7a] text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Welcome to IEEE Club
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Advancing Technology for Humanity. Join us for world-class hackathons, 
              workshops, and tech events that shape the future.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/events">
                <Button size="lg" className="bg-white text-[#00629B] hover:bg-gray-100">
                  Browse Events
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" className="bg-[#FFD700] text-gray-900 hover:bg-[#FFD700]/90 font-semibold">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- START OF MODIFICATION: Replaced "Why Join" with "Browse by Club" --- */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Browse by Club</h2>
          {loadingClubs ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00629B]"></div>
              <p className="mt-4 text-gray-600">Loading clubs...</p>
            </div>
          ) : clubs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {clubs.map((club) => (
                <Link 
                  href={`/events?club=${encodeURIComponent(club.club_name)}`} 
                  key={club.club_name}
                  className="group"
                >
                  <Card className="h-full hover:shadow-xl transition-shadow duration-300">
                    <CardContent className="pt-6 text-center flex flex-col items-center justify-center">
                      <img
                        src={club.club_logo_url}
                        alt={`${club.club_name} logo`}
                        className="w-24 h-24 object-contain rounded-full mx-auto mb-4 border-2 border-gray-100 group-hover:border-[#00629B] transition-colors"
                      />
                      <h3 className="font-semibold text-md text-gray-900 group-hover:text-[#00629B] transition-colors">
                        {club.club_name}
                      </h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Building size={48} className="mx-auto mb-4 text-gray-400" />
                <p>No clubs have set up their profiles yet. Check back soon!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
      {/* --- END OF MODIFICATION --- */}

      {/* Upcoming Events (Unchanged) */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Upcoming Events</h2>
            <Link href="/events">
              <Button variant="outline">View All Events</Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00629B]"></div>
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <p>No upcoming events at the moment. Check back soon!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* About IEEE (Unchanged) */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">About IEEE</h2>
            <p className="text-gray-600 mb-4">
              IEEE (Institute of Electrical and Electronics Engineers) is the world's largest 
              technical professional organization dedicated to advancing technology for the benefit 
              of humanity.
            </p>
            <p className="text-gray-600 mb-6">
              Our student branch brings together students passionate about technology, innovation, 
              and making a difference through engineering and computer science.
            </p>
            <Link href="/events">
              <Button className="bg-[#00629B] hover:bg-[#004d7a]">
                Join Our Next Event
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}