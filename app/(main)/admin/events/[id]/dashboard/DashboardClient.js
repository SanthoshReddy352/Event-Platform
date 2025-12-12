'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Edit, Users, FileEdit, Calendar, Clock, 
  CheckCircle, XCircle, AlertCircle, FileText, Target, Upload,
  Timer, TrendingUp, Sparkles
} from 'lucide-react'
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns'

// ============================================================================
// Animated Stat Card Component
// ============================================================================
function AnimatedStatCard({ title, value, icon: Icon, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 100 }}
      className="h-full"
    >
      <Card className={`h-full relative overflow-hidden border-${color}-500/30 bg-gradient-to-br from-background to-${color}-500/5 hover:shadow-lg hover:shadow-${color}-500/10 transition-all duration-300 group`}>
        <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/10 rounded-full blur-2xl group-hover:bg-${color}-500/20 transition-colors`} />
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium text-${color}-400 flex items-center gap-2`}>
            <Icon size={16} className={`text-${color}-500`} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div 
            className={`text-4xl font-bold text-${color}-500`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.2, type: 'spring', stiffness: 200 }}
          >
            {value}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Countdown Timer Component
// ============================================================================
function CountdownTimer({ targetDate, label, isActive = true }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const calculateTimeLeft = () => {
      const now = new Date()
      const target = new Date(targetDate)
      
      if (target <= now) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }
      }

      return {
        days: differenceInDays(target, now),
        hours: differenceInHours(target, now) % 24,
        minutes: differenceInMinutes(target, now) % 60,
        seconds: differenceInSeconds(target, now) % 60,
        isPast: false
      }
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  if (!isClient) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-red to-purple-600 p-6 text-white">
        <div className="animate-pulse h-24" />
      </div>
    )
  }

  if (timeLeft.isPast) {
    // Only show "Event is Live" if the event is actually active
    if (isActive) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-600 to-emerald-500 p-6 text-white shadow-xl"
        >
          <div className="absolute top-0 right-0 opacity-10">
            <Sparkles size={100} />
          </div>
          <div className="relative z-10">
            <div className="text-white/80 text-sm font-semibold mb-2">{label || 'Event Started'}</div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              <span className="text-xl font-bold">Event is Live!</span>
            </div>
          </div>
        </motion.div>
      )
    } else {
      // Event has passed but is inactive
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-600 to-gray-500 p-6 text-white shadow-xl"
        >
          <div className="absolute top-0 right-0 opacity-10">
            <Clock size={100} />
          </div>
          <div className="relative z-10">
            <div className="text-white/80 text-sm font-semibold mb-2">Event Ended</div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              <span className="text-xl font-bold">Event Completed</span>
            </div>
          </div>
        </motion.div>
      )
    }
  }

  const timeUnits = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Mins', value: timeLeft.minutes },
    { label: 'Secs', value: timeLeft.seconds }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-red to-purple-600 p-6 text-white shadow-xl"
    >
      <div className="absolute top-0 right-0 opacity-10">
        <Timer size={120} />
      </div>
      <div className="relative z-10">
        <div className="text-white/80 text-sm font-semibold mb-1">{label || 'Event Starts In'}</div>
        <div className="flex gap-3 mt-4">
          {timeUnits.map((unit, i) => (
            <motion.div
              key={unit.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="bg-white/20 backdrop-blur-md rounded-lg p-3 text-center min-w-[60px]"
            >
              <div className="text-2xl font-bold tabular-nums">{String(unit.value).padStart(2, '0')}</div>
              <div className="text-[10px] uppercase font-bold text-white/70">{unit.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Quick Action Button Component
// ============================================================================
function QuickActionButton({ href, icon: Icon, title, description, accentColor = 'brand-red' }) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="h-full"
      >
        <Button 
          variant="outline" 
          className={`w-full h-full min-h-[100px] flex flex-col gap-2 p-4 border-2 hover:border-${accentColor}/50 hover:bg-${accentColor}/5 transition-all duration-200`}
        >
          <div className={`p-2 rounded-full bg-${accentColor}/10`}>
            <Icon className={`h-6 w-6 text-${accentColor}`} />
          </div>
          <span className="font-semibold">{title}</span>
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </Button>
      </motion.div>
    </Link>
  )
}

// ============================================================================
// Timeline Component for Hackathon Phases
// ============================================================================
function HackathonTimeline({ event }) {
  const now = new Date()
  
  const phases = [
    { 
      label: 'Problem Selection', 
      start: event.problem_selection_start, 
      end: event.problem_selection_end,
      icon: Target
    },
    { 
      label: 'PPT Release', 
      start: event.ppt_release_time, 
      end: null,
      icon: FileText
    },
    { 
      label: 'Submission', 
      start: event.submission_start, 
      end: event.submission_end,
      icon: Upload
    }
  ]

  const getPhaseStatus = (start, end) => {
    if (!start) return 'not-set'
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : null
    
    if (now < startDate) return 'upcoming'
    if (endDate && now > endDate) return 'completed'
    if (now >= startDate) return 'active'
    return 'upcoming'
  }

  return (
    <div className="space-y-4">
      {phases.map((phase, index) => {
        const status = getPhaseStatus(phase.start, phase.end)
        const Icon = phase.icon
        
        return (
          <motion.div
            key={phase.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-4"
          >
            {/* Timeline Dot */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                status === 'active' ? 'bg-green-500/20 text-green-500 ring-2 ring-green-500 ring-offset-2 ring-offset-background' :
                status === 'completed' ? 'bg-blue-500/20 text-blue-500' :
                status === 'upcoming' ? 'bg-muted text-muted-foreground' :
                'bg-muted/50 text-muted-foreground/50'
              }`}>
                <Icon size={18} />
              </div>
              {index < phases.length - 1 && (
                <div className={`w-0.5 h-12 ${
                  status === 'completed' ? 'bg-blue-500' : 'bg-muted'
                }`} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{phase.label}</h4>
                {status === 'active' && (
                  <Badge className="bg-green-500 text-xs">Active</Badge>
                )}
                {status === 'completed' && (
                  <Badge variant="secondary" className="text-xs">Completed</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground space-y-0.5">
                {phase.start ? (
                  <>
                    <p>Opens: {format(new Date(phase.start), 'PPP p')}</p>
                    {phase.end && <p>Closes: {format(new Date(phase.end), 'PPP p')}</p>}
                  </>
                ) : (
                  <p className="italic">Not configured</p>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Main Dashboard Client Component
// ============================================================================
export default function DashboardClient({ event, stats }) {
  const isHackathon = event.event_type === 'hackathon'
  const isMCQ = event.event_type === 'mcq'

  // Calculate registration progress (if max participants is set)
  const maxParticipants = event.max_participants || 100
  const registrationProgress = Math.min((stats.total / maxParticipants) * 100, 100)

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Link href="/admin/events">
          <Button variant="ghost" size="icon" className="hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{event.title}</h1>
            {isHackathon && <Badge variant="secondary" className="text-sm bg-brand-red/10 text-brand-red border-brand-red/20">Hackathon</Badge>}
            {isMCQ && <Badge variant="secondary" className="text-sm bg-blue-500/10 text-blue-500 border-blue-500/20">MCQ Quiz</Badge>}
            {event.is_active ? (
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Event Management Dashboard</p>
        </div>
        <Link href={`/events/${event.id}`} target="_blank">
          <Button variant="outline" className="gap-2">
            View Public Page
            <ArrowLeft className="h-4 w-4 rotate-[135deg]" />
          </Button>
        </Link>
      </motion.div>

      {/* Countdown Timer - Show for events with dates */}
      {event.event_date && (
        <CountdownTimer 
          targetDate={event.event_date}
          isActive={event.is_active} 
          label={new Date(event.event_date) > new Date() ? "Event Starts In" : null}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <AnimatedStatCard
          title="Total Registrations"
          value={stats.total}
          icon={Users}
          color="gray"
          delay={0}
        />
        <AnimatedStatCard
          title="Approved"
          value={stats.approved}
          icon={CheckCircle}
          color="green"
          delay={0.1}
        />
      </div>

      {/* Event Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-4">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground w-32">Start Date:</span>
              <span className="font-medium">
                {event.event_date ? format(new Date(event.event_date), 'PPP p') : 'Not set'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground w-32">End Date:</span>
              <span className="font-medium">
                {event.event_end_date ? format(new Date(event.event_end_date), 'PPP p') : 'Not set'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <FileEdit className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground w-32">Registration:</span>
              <span className="font-medium">
                {event.registration_open ? (
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Open</Badge>
                ) : (
                  <Badge variant="outline">Closed</Badge>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions - Standard Event */}
      {!isHackathon && !isMCQ && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your event</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickActionButton href={`/admin/events/${event.id}/edit`} icon={Edit} title="Edit Event" description="Basic details" />
              <QuickActionButton href={`/admin/events/${event.id}/form-builder`} icon={FileEdit} title="Registration Form" description="Customize fields" />
              <QuickActionButton href={`/admin/participants/${event.id}`} icon={Users} title="Participants" description="View & manage" />
              <QuickActionButton href={`/admin/events/${event.id}/gallery`} icon={Upload} title="Gallery" description="Event photos" />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* MCQ Quiz Management */}
      {isMCQ && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-blue-500/30 shadow-md bg-gradient-to-br from-background to-blue-500/5">
            <CardHeader>
              <CardTitle className="text-blue-500">Quiz Management</CardTitle>
              <CardDescription>Manage your quiz event</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <QuickActionButton href={`/admin/events/${event.id}/edit`} icon={Edit} title="Edit Event" description="Basic details & timing" accentColor="blue-500" />
              <QuickActionButton href={`/admin/events/${event.id}/form-builder`} icon={FileEdit} title="Registration Form" description="Initial signup form" accentColor="blue-500" />
              <QuickActionButton href={`/admin/events/${event.id}/quiz-builder`} icon={FileText} title="Manage Quiz" description="Add/Edit Questions" accentColor="blue-500" />
              <QuickActionButton href={`/admin/participants/${event.id}`} icon={Users} title="Participants" description="View & approve" accentColor="blue-500" />
              <QuickActionButton href={`/admin/events/${event.id}/quiz-attempts`} icon={Target} title="Submissions" description="View Results" accentColor="blue-500" />
              <QuickActionButton href={`/admin/events/${event.id}/gallery`} icon={Upload} title="Gallery" description="Event Photos" accentColor="blue-500" />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Hackathon Management */}
      {isHackathon && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-brand-red/30 shadow-md bg-gradient-to-br from-background to-brand-red/5">
              <CardHeader>
                <CardTitle className="text-brand-red">Hackathon Management</CardTitle>
                <CardDescription>Manage all aspects of your hackathon</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickActionButton href={`/admin/events/${event.id}/edit`} icon={Edit} title="Edit Event" description="Basic details & timing" />
                <QuickActionButton href={`/admin/events/${event.id}/form-builder`} icon={FileEdit} title="Registration Form" description="Initial signup form" />
                <QuickActionButton href={`/admin/events/${event.id}/problems`} icon={Target} title="Problem Statements" description="Add challenges" />
                <QuickActionButton href={`/admin/events/${event.id}/submission-builder`} icon={Upload} title="Submission Form" description="Final project form" />
                <QuickActionButton href={`/admin/participants/${event.id}`} icon={Users} title="Participants" description="View & approve" />
                <QuickActionButton href={`/admin/events/${event.id}/submissions`} icon={FileText} title="View Submissions" description="Final projects" />
                <QuickActionButton href={`/admin/events/${event.id}/gallery`} icon={Upload} title="Gallery" description="Event Photos" />
              </CardContent>
            </Card>
          </motion.div>

          {/* Hackathon Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Hackathon Timeline</CardTitle>
                <CardDescription>Time-controlled phases</CardDescription>
              </CardHeader>
              <CardContent>
                <HackathonTimeline event={event} />
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  )
}
