'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, CheckCircle, XCircle, FileClock } from 'lucide-react'
import { parseISO, format } from 'date-fns'; 
import { formatInTimeZone } from 'date-fns-tz'; 

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

  if (regStartDate && regEndDate && now >= regStartDate && now < regEndDate && event.registration_open) {
     return { text: 'Registration Open', color: 'bg-green-500', icon: <CheckCircle size={16} /> };
  }
  
  if (event.registration_open && !regStartDate && !regEndDate) {
     return { text: 'Registration Open', color: 'bg-green-500', icon: <CheckCircle size={16} /> };
  }

  return { text: 'Closed', color: 'bg-red-500', icon: <XCircle size={16} /> };
}


export default function EventCard({ event }) {
  const TIME_ZONE = 'Asia/Kolkata'; 
  
  const eventStartDate = event.event_date ? parseISO(event.event_date) : null;
  const eventEndDate = event.event_end_date ? parseISO(event.event_end_date) : null;
  
  const formattedEventDate = formatEventDate(eventStartDate, eventEndDate, TIME_ZONE);
  const status = getEventStatus(event);

  const isEventActive = event.is_active;
  const isCompleted = status.text === 'Completed';

  // --- START OF MODIFICATION: Get club info from event prop ---
  const club = event.club;
  // --- END OF MODIFICATION ---

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
      {/* Event Banner (Unchanged) */}
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
        
        <span 
          className={`absolute top-2 right-2 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5 ${status.color}`}
        >
          {status.icon}
          {status.text}
        </span>
      </div>

      {/* Card Header (Unchanged) */}
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{event.title}</CardTitle>
        <CardDescription className="line-clamp-2 h-10">
          {event.description || 'No description available'}
        </CardDescription>
      </CardHeader>

      {/* Card Content (Unchanged) */}
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <Calendar size={16} className="text-[#00629B] mt-0.5 flex-shrink-0" />
            <span>{formattedEventDate}</span>
          </div>
        </div>
      </CardContent>

      {/* --- START OF MODIFICATION: Updated CardFooter --- */}
      <CardFooter className="mt-auto flex flex-col items-start gap-4">
        {/* Club Info */}
        {club && club.club_name && (
          <div className="flex items-center gap-2 w-full pt-4 border-t">
            <img 
              src={club.club_logo_url || 'https://via.placeholder.com/40'} 
              alt={`${club.club_name} logo`}
              className="w-8 h-8 rounded-full object-contain border"
            />
            <span className="text-sm font-medium text-gray-700">{club.club_name}</span>
          </div>
        )}

        {/* View Event Button */}
        <Link href={`/events/${event.id}`} className="w-full">
          <Button
            className="w-full bg-[#00629B] hover:bg-[#004d7a]"
            disabled={!isEventActive} 
          >
            {isCompleted ? 'View Details' : (isEventActive ? 'View Event' : 'Inactive')}
          </Button>
        </Link>
      </CardFooter>
      {/* --- END OF MODIFICATION --- */}
    </Card>
  )
}