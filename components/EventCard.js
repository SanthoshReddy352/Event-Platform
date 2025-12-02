'use client'

import { memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, CheckCircle, XCircle, FileClock, Clock } from 'lucide-react'
import { parseISO, format } from 'date-fns'; 
import { formatInTimeZone } from 'date-fns-tz'; 
import { Badge } from '@/components/ui/badge'

// Helper function to format date ranges (unchanged)
const formatEventDate = (start, end, timeZone) => {
  if (!start) return 'Date TBA';
  
  const tz = formatInTimeZone(start, timeZone, 'zzz');
  const startDate = formatInTimeZone(start, timeZone, 'MMM dd');
  const startTime = formatInTimeZone(start, timeZone, 'hh:mm a');
  
  if (!end) {
    return `${startDate} at ${startTime} ${tz}`;
  }

  const endDate = formatInTimeZone(end, timeZone, 'MMM dd');
  const endTime = formatInTimeZone(end, timeZone, 'hh:mm a');

  if (startDate === endDate) {
    return `${startDate} · ${startTime} - ${endTime} ${tz}`;
  }
  
  return `${startDate} ${startTime} - ${endDate} ${endTime} ${tz}`;
}

// Helper function to get event status (unchanged)
const getEventStatus = (event) => {
  const now = new Date();
  const eventEndDate = event.event_end_date ? parseISO(event.event_end_date) : null;
  const regStartDate = event.registration_start ? parseISO(event.registration_start) : null;
  const regEndDate = event.registration_end ? parseISO(event.registration_end) : null;
  const eventStartDate = event.event_date ? parseISO(event.event_date) : null;

  if (eventEndDate && now > eventEndDate) {
    return { text: 'Completed', color: 'bg-gray-500', icon: <CheckCircle size={16} /> };
  }
  
  if (!event.is_active) {
    return { text: 'Inactive', color: 'bg-gray-400' };
  }

  // Check if event is currently ongoing
  if (eventStartDate && eventEndDate && now >= eventStartDate && now <= eventEndDate) {
      return { text: 'Ongoing', color: 'bg-blue-600', icon: <Clock size={16} /> };
  }

  if (regStartDate && now < regStartDate) {
    return { 
      text: `Opens ${format(regStartDate, 'MMM dd')}`, 
      color: 'bg-blue-500',
      icon: <FileClock size={16} />
    };
  }

  if ((regEndDate && now > regEndDate) || !event.registration_open) {
    return { text: 'Registration Closed', color: 'bg-red-500', icon: <XCircle size={16} /> };
  }

  if (regStartDate && regEndDate && now >= regStartDate && now < regEndDate && event.registration_open) {
     return { text: 'Registration Open', color: 'bg-green-500', icon: <CheckCircle size={16} /> };
  }
  
  if (event.registration_open && !regStartDate && !regEndDate) {
     return { text: 'Registration Open', color: 'bg-green-500', icon: <CheckCircle size={16} /> };
  }

  return { text: 'Closed', color: 'bg-red-500', icon: <XCircle size={16} /> };
}

// [OPTIMIZED] Wrapped in React.memo to prevent unnecessary re-renders
const EventCard = memo(function EventCard({ event }) {
  const TIME_ZONE = 'Asia/Kolkata'; 
  
  const eventStartDate = event.event_date ? parseISO(event.event_date) : null;
  const eventEndDate = event.event_end_date ? parseISO(event.event_end_date) : null;
  
  const formattedEventDate = formatEventDate(eventStartDate, eventEndDate, TIME_ZONE);
  const status = getEventStatus(event);

  const isEventActive = event.is_active;
  const isCompleted = status.text === 'Completed';

  const club = event.club;

  // Format Event Type (e.g., 'hackathon' -> 'Hackathon')
  const eventType = event.event_type ? event.event_type.replace('_', ' ') : 'Event';

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
      {/* Event Banner */}
      <div className="w-full h-48 bg-brand-gradient relative">
        {event.banner_url ? (
          <img
            src={event.banner_url}
            alt={event.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold p-4 text-center">
            {event.title}
          </div>
        )}
        
        {/* NEW: Event Type Badge (Top Left) */}
        <div className="absolute top-2 left-2">
            <Badge className="bg-white/90 text-black hover:bg-white/75 shadow-sm backdrop-blur-sm capitalize">
              {eventType}
            </Badge>
        </div>

        {/* Status Badge (Top Right) */}
        <span 
          className={`absolute top-2 right-2 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5 ${status.color}`}
        >
          {status.icon}
          {status.text}
        </span>
      </div>

      {/* Card Header */}
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{event.title}</CardTitle>
        <CardDescription className="line-clamp-2 h-10">
          {event.description || 'No description available'}
        </CardDescription>
      </CardHeader>

      {/* Card Content */}
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex items-start space-x-2">
            <Calendar size={16} className="text-brand-red mt-0.5 flex-shrink-0" />
            <span>{formattedEventDate}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex flex-col items-start gap-4">
        {/* Club Info */}
        {club && club.club_name && (
          <div className="flex items-center gap-2 w-full pt-4 border-t border-border">
            <img 
              src={club.club_logo_url || 'https://via.placeholder.com/40'} 
              alt={`${club.club_name} logo`}
              className="w-8 h-8 rounded-full object-contain border border-border"
              loading="lazy"
            />
            <span className="text-sm font-medium text-gray-300">{club.club_name}</span>
          </div>
        )}

        {/* View Event Button */}
        <Link href={`/events/${event.id}`} className="w-full">
          <Button
            className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
            disabled={!isEventActive} 
          >
            {isCompleted ? 'View Details' : (isEventActive ? 'View Event' : 'Inactive')}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
});

export default EventCard