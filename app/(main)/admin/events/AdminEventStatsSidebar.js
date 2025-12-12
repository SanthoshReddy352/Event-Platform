'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { 
  Trophy, 
  Calendar as CalendarIcon, 
  Users, 
  Zap, 
  TrendingUp,
  Clock
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

export default function AdminEventStatsSidebar({ 
  events = [], 
  totalParticipants = 0 
}) {
  const [date, setDate] = useState(new Date())

  // Calculate Stats
  const now = new Date()
  const activeEvents = events.filter(e => {
    const isCompleted = e.event_end_date && new Date() > new Date(e.event_end_date)
    return e.is_active && !isCompleted
  })
  const completedEvents = events.filter(e => {
    return e.event_end_date && new Date() > new Date(e.event_end_date)
  })

  // Find Next Event
  const upcomingEvents = events
    .filter(e => e.event_date && new Date(e.event_date) > now)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null

  // Create a Set of event dates for highlighting in calendar
  const eventDates = new Set(
    events
      .filter(e => e.event_date)
      .map(e => new Date(e.event_date).toDateString())
  )

  return (
    <div className="space-y-4">
      {/* 1. Next Up Countdown Card */}
      {nextEvent && <CountdownCard event={nextEvent} />}

      {/* 2. Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Zap className="w-5 h-5 text-green-400" />}
          label="Active"
          value={activeEvents.length}
          color="green"
          delay={0.1}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-yellow-400" />}
          label="Completed"
          value={completedEvents.length}
          color="yellow"
          delay={0.15}
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-400" />}
          label="Participants"
          value={totalParticipants}
          color="blue"
          delay={0.2}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
          label="Total Events"
          value={events.length}
          color="purple"
          delay={0.25}
        />
      </div>

      {/* 3. Event Calendar */}
      <Card className="overflow-hidden border-gray-800 bg-black/40 backdrop-blur-md">
        <CardHeader className="bg-gray-900/50 pb-2 border-b border-gray-800">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-300">
            <CalendarIcon className="w-4 h-4 text-brand-red" /> 
            Event Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border-0"
            classNames={{
              day_today: "bg-brand-red/20 text-brand-red font-bold",
              day_selected: "bg-brand-red text-white hover:bg-brand-red/80",
            }}
            modifiers={{
              hasEvent: (date) => eventDates.has(date.toDateString())
            }}
            modifiersClassNames={{
              hasEvent: "bg-green-900/30 font-bold text-green-400 rounded-full ring-1 ring-green-500/50"
            }}
          />
        </CardContent>
      </Card>

      {/* 4. Quick Tips Card */}
      <Card className="border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-brand-red/10 rounded-lg shrink-0">
              <Clock className="w-4 h-4 text-brand-red" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white mb-1">Quick Tip</h4>
              <p className="text-xs text-gray-400">
                Click on any event card to open its dashboard and manage participants, quizzes, and submissions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon, label, value, color, delay }) {
  const colorClasses = {
    green: 'bg-green-900/20 border-green-900/30',
    yellow: 'bg-yellow-900/20 border-yellow-900/30',
    blue: 'bg-blue-900/20 border-blue-900/30',
    purple: 'bg-purple-900/20 border-purple-900/30',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className={`border-gray-800 ${colorClasses[color]} backdrop-blur-md hover:scale-105 transition-transform`}>
        <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
          <div className="p-2 bg-black/30 rounded-full">
            {icon}
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-gray-400">{label}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function CountdownCard({ event }) {
  const eventDate = new Date(event.event_date)
  const daysLeft = differenceInDays(eventDate, new Date())
  const isToday = daysLeft === 0
  const isPast = daysLeft < 0

  if (isPast) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-red via-red-600 to-purple-700 text-white p-5 shadow-xl shadow-brand-red/20"
    >
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <CalendarIcon size={100} />
      </div>

      {/* Animated pulse effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-white/20 text-white hover:bg-white/30 border-none text-xs">
            Next Event
          </Badge>
        </div>
        
        <h3 className="text-lg font-bold mb-4 line-clamp-1">{event.title}</h3>
        
        <div className="flex gap-4 items-center">
          <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 text-center min-w-[70px]">
            <div className="text-3xl font-bold">{isToday ? '🎉' : daysLeft}</div>
            <div className="text-[10px] uppercase font-bold text-white/70">
              {isToday ? 'Today!' : 'Days Left'}
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none text-xs">
              📅 {format(eventDate, 'MMM dd, yyyy')}
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none text-xs">
              🕐 {format(eventDate, 'hh:mm a')}
            </Badge>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
