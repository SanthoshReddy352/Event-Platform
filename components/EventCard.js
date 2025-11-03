'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, Users } from 'lucide-react'
import { format } from 'date-fns'

export default function EventCard({ event }) {
  const formattedDate = event.event_date
    ? format(new Date(event.event_date), 'MMMM dd, yyyy')
    : 'Date TBA'

  const formattedTime = event.event_date
    ? format(new Date(event.event_date), 'hh:mm a')
    : ''

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Event Banner */}
      <div className="w-full h-48 bg-gradient-to-br from-[#00629B] to-[#004d7a] relative">
        {event.banner_url ? (
          <img
            src={event.banner_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
            {event.title}
          </div>
        )}
        {event.registration_open && (
          <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-3 py-1 rounded-full">
            Open
          </span>
        )}
      </div>

      <CardHeader>
        <CardTitle className="text-xl">{event.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {event.description || 'No description available'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Calendar size={16} className="text-[#00629B]" />
            <span>{formattedDate}</span>
          </div>
          {formattedTime && (
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-[#00629B]" />
              <span>{formattedTime}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Link href={`/events/${event.id}`} className="w-full">
          <Button
            className="w-full bg-[#00629B] hover:bg-[#004d7a]"
            disabled={!event.registration_open}
          >
            {event.registration_open ? 'Register Now' : 'Registration Closed'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
