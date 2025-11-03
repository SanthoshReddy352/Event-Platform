'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, CheckCircle, XCircle, FileClock } from 'lucide-react'
import { parseISO, format } from 'date-fns'; 
import { formatInTimeZone } from 'date-fns-tz'; 

// Helper function to format date ranges
const formatEventDate = (start, end, timeZone) => {
  if (!start) return 'Date TBA';
  
  const startDate = formatInTimeZone(start, timeZone, 'MMM dd');
  // MODIFIED: 'zzz' is now inside the format string
  const startTime = formatInTimeZone(start, timeZone, 'hh:mm a zzz'); 
  
  if (!end) {
    // Single-day event without end time
    return `${startDate} at ${startTime}`;
  }

  const endDate = formatInTimeZone(end, timeZone, 'MMM dd');
  // MODIFIED: 'zzz' is now inside the format string
  const endTime = formatInTimeZone(end, timeZone, 'hh:mm a zzz');

  if (startDate === endDate) {
    // Single-day event
    // MODIFIED: Removed one of the 'zzz' tokens for cleanliness
    return `${startDate} · ${formatInTimeZone(start, timeZone, 'hh:mm a')} - ${endTime}`;
  }
  
  // Multi-day event
  return `${startDate}, ${startTime} - ${endDate}, ${endTime}`;
}

// Helper function to get event status
const getEventStatus = (event) => {
  const now = new Date();
  const eventEndDate = event.event_end_date ? parseISO(event.event_end_date) : null;
  const regStartDate = event.registration_start ? parseISO(event.registration_start) : null;
  const regEndDate = event.registration_end ? parseISO(event.registration_end) : null;

  if (eventEndDate && now > eventEndDate) {
    return { text: 'Completed', color: 'bg-gray-500', icon: <CheckCircle size={16} /> };
  }
  
  if (!event.is_active) {
    return { text: 'Inactive', color: 'bg-gray-400' };
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

  // Check for open registration with dates
  if (regStartDate && regEndDate && now >= regStartDate && now < regEndDate && event.registration_open) {
     return { text: 'Registration Open', color: 'bg-green-500', icon: <CheckCircle size={16} /> };
  }
  
  // Fallback if no dates are set but it's "open"
  if (event.registration_open && !regStartDate && !regEndDate) {
     return { text: 'Registration Open', color: 'bg-green-500', icon: <CheckCircle size={16} /> };
  }

  // Default fallback
  return { text: 'Closed', color: 'bg-red-500', icon: <XCircle size={16} /> };
}


export default function EventCard({ event }) {
  const TIME_ZONE = 'Asia/Kolkata'; // Indian Standard Time
  
  const eventStartDate = event.event_date ? parseISO(event.event_date) : null;
  const eventEndDate = event.event_end_date ? parseISO(event.event_end_date) : null;
  
  const formattedEventDate = formatEventDate(eventStartDate, eventEndDate, TIME_ZONE);
  const status = getEventStatus(event);

  // Determine if the event is active (visible)
  const isEventActive = event.is_active;
  const isCompleted = status.text === 'Completed';

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
      {/* Event Banner */}
      <div className="w-full h-48 bg-gradient-to-br from-[#00629B] to-[#004d7a] relative">
        {event.banner_url ? (
          <img
            src={event.banner_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold p-4 text-center">
            {event.title}
          </div>
        )}
        
        {/* Automated Status Badge */}
        <span 
          className={`absolute top-2 right-2 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5 ${status.color}`}
        >
          {status.icon}
          {status.text}
        </span>
      </div>

      <CardHeader>
        <CardTitle className="text-xl">{event.title}</CardTitle>
        <CardDescription className="line-clamp-2 h-10">
          {event.description || 'No description available'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <Calendar size={16} className="text-[#00629B] mt-0.5 flex-shrink-0" />
            <span>{formattedEventDate}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto">
        <Link href={`/events/${event.id}`} className="w-full">
          <Button
            className="w-full bg-[#00629B] hover:bg-[#004d7a]"
            disabled={!isEventActive} 
          >
            {isCompleted ? 'View Details' : (isEventActive ? 'View Event' : 'Inactive')}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}