'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { Trophy, Calendar as CalendarIcon, Clock, Flame } from 'lucide-react'
import { useState, useEffect } from 'react'
import { format, differenceInDays, differenceInHours } from 'date-fns'

export default function EventStatsSidebar({ upcomingEvents, pastEvents }) {
  const [date, setDate] = useState(new Date())

  // Calculate Stats
  const totalEvents = upcomingEvents.length + pastEvents.length
  const upcomingCount = upcomingEvents.length
  const completedCount = pastEvents.length
  
  // Find Next Event
  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null // Assumes sorted
  
  // Create a Set of event dates for highlighting in calendar
  const eventDates = new Set([
     ...upcomingEvents.map(e => new Date(e.event_date).toDateString()),
     ...pastEvents.map(e => new Date(e.event_date).toDateString())
  ])

  // Custom Day Component for Calendar to show dots
//   const modifiers = {
//     event: (date) => eventDates.has(date.toDateString())
//   }
//   const modifiersStyles = {
//     event: {
//         color: 'var(--brand-red)',
//         fontWeight: 'bold',
//         textDecoration: 'underline'
//     }
//   }

  return (
    <div className="space-y-4">
      {/* 1. Next Up Card */}
      {nextEvent && (
        <CountdownCard event={nextEvent} />
      )}

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          icon={<Trophy className="w-5 h-5 text-yellow-500" />}
          label="Completed"
          value={completedCount}
          delay={0.1}
        />
         <StatCard 
          icon={<CalendarIcon className="w-5 h-5 text-blue-500" />}
          label="Upcoming"
          value={upcomingCount}
          delay={0.2}
        />
        <StatCard 
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          label="Total"
          value={totalEvents}
          delay={0.3}
        />
        <StatCard 
          icon={<Clock className="w-5 h-5 text-purple-500" />}
          label="Pending"
          value={0} // Placeholder or calculate if you have pending approvals
          delay={0.4}
        />
      </div>

      {/* 3. Calendar */}
      <Card className="overflow-hidden border-none shadow-lg bg-card/50 backdrop-blur-sm">
        <CardHeader className="bg-muted/50 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" /> Your Schedule
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex justify-center">
            <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border-0"
                modifiers={{
                    hasEvent: (date) => eventDates.has(date.toDateString())
                }}
                modifiersClassNames={{
                    hasEvent: "bg-primary/10 font-bold text-primary rounded-full hover:bg-primary/20"
                }}
            />
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon, label, value, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
        >
            <Card className="border-none shadow-md bg-card/80 hover:bg-card transition-colors">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="p-2 bg-muted rounded-full">
                        {icon}
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{value}</div>
                        <div className="text-xs text-muted-foreground">{label}</div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

function CountdownCard({ event }) {
    const eventDate = new Date(event.event_date);
    const daysLeft = differenceInDays(eventDate, new Date());
    const isToday = daysLeft === 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-red to-purple-600 text-white p-6 shadow-xl"
        >
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <CalendarIcon size={120} />
            </div>

            <div className="relative z-10">
                <div className="text-white/80 text-sm font-semibold mb-1">Next Up</div>
                <h3 className="text-xl font-bold mb-4 line-clamp-1">{event.title}</h3>
                
                <div className="flex gap-4">
                    <div className="bg-white/20 backdrop-blur-md rounded-lg p-2 text-center min-w-[60px]">
                        <div className="text-2xl font-bold">{isToday ? '0' : daysLeft}</div>
                        <div className="text-[10px] uppercase font-bold text-white/70">{isToday ? 'Hours' : 'Days'}</div>
                    </div>
                    <div className="flex flex-col justify-center gap-1">
                        <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none w-fit">
                            {format(eventDate, 'MMM dd, yyyy')}
                        </Badge>
                        <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none w-fit">
                            {format(eventDate, 'hh:mm a')}
                        </Badge>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
