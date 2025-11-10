'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import EventCard from '@/components/EventCard'
import GradientText from '@/components/GradientText'
import { Calendar, Users, Trophy, Zap, Building } from 'lucide-react' // Import Building

export default function Home() {
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [clubs, setClubs] = useState([])
  const [loadingClubs, setLoadingClubs] = useState(true)

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


  return (
    <div>
      {/* Hero Section */}
      {/* --- START OF THEME CHANGE --- */}
      <section className="bg-brand-gradient text-white py-20"> {/* CHANGED */}
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              <GradientText>Welcome to EventX</GradientText>
            </h1>
            <p className="text-xl mb-8 text-white/90">
              Your central hub for hackathons, workshops, and tech events
              from every club on campus.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/events">
                <Button size="lg" className="bg-white text-brand-red font-semibold hover:bg-gray-100"> {/* CHANGED */}
                  Browse Events
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-brand-red"> {/* CHANGED */}
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* --- END OF THEME CHANGE --- */}

      {/* Browse by Club (Unchanged) */}
      <section className="py-16 bg-card"> {/* CHANGED: bg-gray-50 to bg-card */}
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            <GradientText>Browse by Club</GradientText>
          </h2>
          {loadingClubs ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div> {/* CHANGED */}
              <p className="mt-4 text-gray-400">Loading clubs...</p> {/* CHANGED */}
            </div>
          ) : clubs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {clubs.map((club) => (
                <Link 
                  href={`/events?club=${encodeURIComponent(club.club_name)}`} 
                  key={club.club_name}
                  className="group"
                >
                  <Card className="h-full hover:shadow-xl transition-shadow duration-300 bg-background hover:bg-zinc-900"> {/* CHANGED */}
                    <CardContent className="pt-6 text-center flex flex-col items-center justify-center">
                      <img
                        src={club.club_logo_url}
                        alt={`${club.club_name} logo`}
                        className="w-24 h-24 object-contain rounded-full mx-auto mb-4 border-2 border-border group-hover:border-brand-orange transition-colors" // CHANGED
                      />
                      <h3 className="font-semibold text-md text-gray-100 group-hover:text-brand-orange transition-colors"> {/* CHANGED */}
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

      {/* Upcoming Events (Unchanged) */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">
              <GradientText>Upcoming Events</GradientText>
            </h2>
            <Link href="/events">
              <Button variant="outline">View All Events</Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div> {/* CHANGED */}
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

      {/* About Section */}
      <section className="py-16 bg-card"> {/* CHANGED */}
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              <GradientText>About EventX</GradientText>
            </h2>
            <p className="text-gray-400 mb-4"> {/* CHANGED */}
              EventX is your college's central platform for discovering and managing
              technical and non-technical events.
            </p>
            <p className="text-gray-400 mb-6"> {/* CHANGED */}
              Our mission is to bring all student-run clubs together, making it
              easy for students to find opportunities and for clubs to manage their participants.
            </p>
            <Link href="/events">
              <Button className="bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"> {/* CHANGED */}
                Join Our Next Event
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}