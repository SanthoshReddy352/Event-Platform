'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import EventCard from '@/components/EventCard'
import { Calendar, Users, Trophy, Zap } from 'lucide-react'

export default function Home() {
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingEvents()
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

  return (
    <div>
      {/* Hero Section */}
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

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Join IEEE Club?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-[#00629B] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="text-white" size={32} />
                </div>
                <h3 className="font-bold text-lg mb-2">Regular Events</h3>
                <p className="text-gray-600 text-sm">
                  24-hour hackathons, workshops, and tech talks throughout the year
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-[#00629B] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-white" size={32} />
                </div>
                <h3 className="font-bold text-lg mb-2">Community</h3>
                <p className="text-gray-600 text-sm">
                  Connect with like-minded tech enthusiasts and industry experts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-[#00629B] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="text-white" size={32} />
                </div>
                <h3 className="font-bold text-lg mb-2">Win Prizes</h3>
                <p className="text-gray-600 text-sm">
                  Compete for exciting prizes and recognition in our competitions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 bg-[#00629B] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="text-white" size={32} />
                </div>
                <h3 className="font-bold text-lg mb-2">Learn & Grow</h3>
                <p className="text-gray-600 text-sm">
                  Enhance your skills through hands-on projects and mentorship
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
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

      {/* About IEEE */}
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
