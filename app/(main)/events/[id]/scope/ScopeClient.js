'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, Loader2, Clock, Target, FileText, Download,
  CheckCircle, Lock, ChevronRight, Calendar, Trophy, Sparkles
} from 'lucide-react'
import { format, isBefore, isAfter, isWithinInterval, differenceInSeconds } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

// ============================================================================
// Animation Variants
// ============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
}

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  }
}

// ============================================================================
// Countdown Timer Component
// ============================================================================
function CountdownTimer({ targetDate, label }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    if (!targetDate) return

    const calculateTimeLeft = () => {
      const difference = differenceInSeconds(new Date(targetDate), new Date())
      if (difference > 0) {
        return {
          days: Math.floor(difference / (3600 * 24)),
          hours: Math.floor((difference / 3600) % 24),
          minutes: Math.floor((difference / 60) % 60),
          seconds: Math.floor(difference % 60)
        }
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="flex flex-col items-center justify-center p-5 glass-card rounded-2xl text-white min-w-[220px] border border-white/10 shadow-2xl"
    >
      <span className="text-xs uppercase tracking-widest text-white/60 mb-3 font-medium">{label}</span>
      <div className="flex items-end gap-1.5">
        {[
          { value: timeLeft.days, label: 'DAYS' },
          { value: timeLeft.hours, label: 'HRS' },
          { value: timeLeft.minutes, label: 'MIN' },
          { value: timeLeft.seconds, label: 'SEC', highlight: true }
        ].map((unit, index) => (
          <div key={unit.label} className="flex items-center gap-1.5">
            <div className="text-center">
              <div className={`text-2xl md:text-3xl font-bold font-mono tabular-nums ${unit.highlight ? 'text-brand-orange' : 'text-white'}`}>
                {String(unit.value).padStart(2, '0')}
              </div>
              <div className="text-[9px] text-white/40 tracking-wider">{unit.label}</div>
            </div>
            {index < 3 && <span className="text-xl font-bold text-white/30 mb-3">:</span>}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Journey Step Component
// ============================================================================
function JourneyStep({ title, subtitle, dates, status, isLast, delay }) {
  const getStatusStyles = () => {
    switch (status) {
      case 'completed': return { dot: 'bg-green-500 border-green-500 shadow-green-500/50', line: 'bg-green-500/50', text: 'text-white' }
      case 'active': return { dot: 'bg-brand-orange border-brand-orange animate-pulse shadow-brand-orange/50', line: 'bg-gray-700', text: 'text-white' }
      default: return { dot: 'bg-black border-gray-600', line: 'bg-gray-800', text: 'text-gray-500' }
    }
  }
  const styles = getStatusStyles()

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative flex items-start gap-4"
    >
      {/* Connector Line */}
      {!isLast && (
        <div className={`absolute left-[5px] top-6 bottom-0 w-0.5 ${styles.line}`} style={{ height: 'calc(100% + 16px)' }} />
      )}
      
      {/* Status Dot */}
      <div className={`relative z-10 w-3 h-3 mt-1.5 rounded-full border-2 shadow-lg ${styles.dot}`} />
      
      {/* Content */}
      <div className="flex-1 pb-6">
        <p className={`text-sm font-bold ${styles.text}`}>{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        {dates && (
          <div className="text-[11px] text-gray-500 mt-2 space-y-0.5">
            {dates.map((date, i) => (
              <div key={i}>{date}</div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Action Card Component
// ============================================================================
function ActionCard({ 
  icon: Icon, 
  iconColor,
  title, 
  description, 
  badge, 
  badgeStyle,
  children, 
  className = '',
  highlight = false,
  delay = 0
}) {
  return (
    <motion.div 
      variants={itemVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`
        h-full glass-card rounded-2xl p-6 flex flex-col relative overflow-hidden
        transition-all duration-300 group
        ${highlight ? 'border-brand-orange/50 shadow-[0_0_40px_-10px_rgba(255,145,77,0.3)]' : 'hover:border-white/20 hover:bg-white/5'}
        ${className}
      `}
    >
      {/* Background Icon */}
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={100} />
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-${iconColor}/10 text-${iconColor}`} style={{ backgroundColor: `var(--${iconColor}, rgba(255,255,255,0.1))` }}>
          <Icon size={24} className={iconColor.includes('brand') ? `text-${iconColor}` : ''} style={{ color: iconColor.startsWith('#') ? iconColor : undefined }} />
        </div>
        {badge && (
          <Badge className={badgeStyle}>
            {badge.icon && <badge.icon className="mr-1.5 h-3.5 w-3.5" />}
            {badge.text}
          </Badge>
        )}
      </div>
      
      <h3 className="text-xl md:text-2xl font-bold mb-2 text-white group-hover:text-brand-orange transition-colors">{title}</h3>
      {description && <p className="text-gray-400 mb-4 flex-1 line-clamp-3">{description}</p>}
      
      {/* Children (Actions/Content) */}
      <div className="mt-auto">
        {children}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Main ScopeClient Component
// ============================================================================
export default function ScopeClient({ 
  initialEvent, 
  initialParticipant, 
  initialSelectedProblem,
  userId,
  userEmail
}) {
  const router = useRouter()
  const { user } = useAuth()
  
  const [event, setEvent] = useState(initialEvent)
  const [participant, setParticipant] = useState(initialParticipant)
  const [selectedProblem, setSelectedProblem] = useState(initialSelectedProblem)
  const [now, setNow] = useState(new Date())

  // Timer to update "now" for real-time phase checks
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Real-time subscription for participant updates
  useEffect(() => {
    if (!user?.id || !event?.id) return

    const channel = supabase
      .channel(`scope_dashboard:${event.id}:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', 
          schema: 'public',
          table: 'participants',
          filter: `event_id=eq.${event.id}`
        },
        async (payload) => {
          if (payload.new && payload.new.user_id === user.id) {
            setParticipant(prev => ({ ...prev, ...payload.new }))
            // If problem changed, refetch problem details
            if (payload.new.selected_problem_id && payload.new.selected_problem_id !== participant?.selected_problem_id) {
              const { data } = await supabase
                .from('problem_statements')
                .select('title, description')
                .eq('id', payload.new.selected_problem_id)
                .single()
              if (data) setSelectedProblem(data)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, event?.id, participant?.selected_problem_id])

  // --- Phase Helpers ---
  const isProblemSelectionActive = () => {
    if (!event?.problem_selection_start || !event?.problem_selection_end) return false
    return isWithinInterval(now, {
      start: new Date(event.problem_selection_start),
      end: new Date(event.problem_selection_end)
    })
  }

  const isPptActive = () => {
    if (!event?.ppt_release_time) return false
    return isAfter(now, new Date(event.ppt_release_time))
  }

  const isSubmissionActive = () => {
    if (!event?.submission_start || !event?.submission_end) return false
    return isWithinInterval(now, {
      start: new Date(event.submission_start),
      end: new Date(event.submission_end)
    })
  }

  // --- Derived State ---
  const hasSelectedProblem = !!participant?.selected_problem_id
  const hasSubmitted = !!participant?.submitted_at
  const problemSelectionOpen = isProblemSelectionActive()
  const pptAvailable = isPptActive()
  const submissionOpen = isSubmissionActive()

  const getStepStatus = (step) => {
    if (step === 'problem') {
      if (hasSelectedProblem) return 'completed'
      if (problemSelectionOpen) return 'active'
      return 'upcoming'
    }
    if (step === 'ppt') {
      if (pptAvailable) return 'completed'
      if (isBefore(now, new Date(event?.ppt_release_time || now))) return 'upcoming'
      return 'active'
    }
    if (step === 'submission') {
      if (hasSubmitted) return 'completed'
      if (submissionOpen) return 'active'
      return 'upcoming'
    }
    return 'upcoming'
  }

  // Determine Countdown Target
  let countdownTarget = null
  let countdownLabel = ''

  if (problemSelectionOpen && !hasSelectedProblem) {
    countdownTarget = event?.problem_selection_end
    countdownLabel = 'Problem Selection Ends In'
  } else if (!pptAvailable && event?.ppt_release_time) {
    countdownTarget = event.ppt_release_time
    countdownLabel = 'PPT Template Release In'
  } else if (submissionOpen && !hasSubmitted) {
    countdownTarget = event?.submission_end
    countdownLabel = 'Submission Deadline'
  } else if (hasSubmitted) {
    countdownTarget = event?.event_end_date
    countdownLabel = 'Hackathon Ends In'
  }

  const displayName = userEmail?.split('@')[0] || 'Participant'

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand-red/30">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden bg-brand-gradient">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
        
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-red/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-20 w-96 h-96 bg-brand-orange/20 rounded-full blur-[150px]" />
        
        <div className="container mx-auto px-4 py-12 relative z-10">
          <Link href={`/events/${event?.id}`}>
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 mb-6 -ml-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event
            </Button>
          </Link>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8"
          >
            <div>
              <Badge className="mb-4 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md">
                <Sparkles className="mr-1.5 h-3 w-3" />
                Hackathon Workspace
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 tracking-tight">
                {event?.title}
              </h1>
              <p className="text-lg md:text-xl text-white/80 max-w-2xl">
                Welcome, <span className="text-white font-semibold">{displayName}</span>. 
                Your command center for innovation.
              </p>
            </div>

            {countdownTarget && (
              <CountdownTimer targetDate={countdownTarget} label={countdownLabel} />
            )}
          </motion.div>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="container mx-auto px-4 py-12 -mt-8 relative z-20">
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          
          {/* 1. EVENT JOURNEY (Vertical Timeline - 1 col, spans 2 rows) */}
          <motion.div variants={itemVariants} className="md:col-span-1 lg:col-span-1 md:row-span-2">
            <div className="h-full glass-card rounded-2xl p-6 flex flex-col border border-white/10">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Calendar className="text-brand-orange" size={20} />
                Event Journey
              </h3>
              
              <div className="relative flex flex-col flex-1">
                <JourneyStep 
                  title="Problem Selection"
                  dates={[
                    `Opens: ${event?.problem_selection_start ? format(new Date(event.problem_selection_start), 'MMM d, h:mm a') : 'TBA'}`,
                    `Closes: ${event?.problem_selection_end ? format(new Date(event.problem_selection_end), 'MMM d, h:mm a') : 'TBA'}`
                  ]}
                  status={getStepStatus('problem')}
                  delay={0.1}
                />
                <JourneyStep 
                  title="PPT Release"
                  dates={[`Released: ${event?.ppt_release_time ? format(new Date(event.ppt_release_time), 'MMM d, h:mm a') : 'TBA'}`]}
                  status={getStepStatus('ppt')}
                  delay={0.2}
                />
                <JourneyStep 
                  title="Final Submission"
                  dates={[
                    `Opens: ${event?.submission_start ? format(new Date(event.submission_start), 'MMM d, h:mm a') : 'TBA'}`,
                    `Closes: ${event?.submission_end ? format(new Date(event.submission_end), 'MMM d, h:mm a') : 'TBA'}`
                  ]}
                  status={getStepStatus('submission')}
                  isLast
                  delay={0.3}
                />
              </div>
            </div>
          </motion.div>

          {/* 2. PROBLEM CARD (Large - 2 cols) */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2">
            <ActionCard
              icon={Target}
              iconColor="#EF4444"
              title="Problem Statement"
              description={hasSelectedProblem && selectedProblem 
                ? undefined 
                : "Choose the challenge you want to solve. Once selected, your choice is permanent."
              }
              badge={
                hasSelectedProblem 
                  ? { text: 'Selected', icon: CheckCircle }
                  : problemSelectionOpen 
                    ? { text: 'Action Required' }
                    : { text: 'Closed' }
              }
              badgeStyle={
                hasSelectedProblem 
                  ? 'bg-green-500/20 text-green-500 border-green-500/20'
                  : problemSelectionOpen 
                    ? 'bg-brand-orange text-white animate-pulse border-brand-orange'
                    : 'text-gray-500 border-gray-700'
              }
            >
              {hasSelectedProblem && selectedProblem ? (
                <div className="flex flex-col flex-1">
                  <h4 className="text-lg font-semibold text-brand-orange mb-2">{selectedProblem.title}</h4>
                  <p className="text-gray-400 line-clamp-2 mb-4">
                    {selectedProblem.description}
                  </p>
                  <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full border-white/10 hover:bg-white/10 hover:text-white">
                          View Full Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-black/90 border-white/10 text-white backdrop-blur-xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold text-brand-orange">
                            {selectedProblem.title}
                          </DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[60vh] mt-4 pr-4">
                          <div className="space-y-4">
                            <div className="prose prose-invert max-w-none">
                              <p className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                                {selectedProblem.description}
                              </p>
                            </div>
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                    
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle size={16} />
                      <span>You have locked this problem statement.</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-auto">
                  {problemSelectionOpen ? (
                    <Link href={`/events/${event?.id}/scope/problems`}>
                      <Button className="w-full bg-white text-black hover:bg-gray-200 font-semibold h-12 text-lg group">
                        Select Problem
                        <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled className="w-full bg-gray-800 text-gray-500 border border-gray-700">
                      Selection Closed
                    </Button>
                  )}
                </div>
              )}
            </ActionCard>
          </motion.div>

          {/* 3. PPT TEMPLATE (Medium - 1 col) */}
          <motion.div variants={itemVariants} className="md:col-span-1 lg:col-span-1">
            <div className="h-full glass-card rounded-2xl p-6 flex flex-col hover:bg-white/5 transition-colors border border-white/10 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                  <Download size={24} />
                </div>
                {pptAvailable && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/20">New</Badge>}
              </div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-blue-400 transition-colors">PPT Template</h3>
              <p className="text-sm text-gray-500 mb-4 flex-1">Download the official presentation template for your project.</p>
              
              {event?.ppt_template_url ? (
                <a 
                  href={pptAvailable ? event.ppt_template_url : '#'} 
                  target={pptAvailable ? "_blank" : undefined} 
                  rel="noopener noreferrer"
                  className={`mt-auto ${!pptAvailable ? 'pointer-events-none' : ''}`}
                >
                  <Button 
                    variant="outline" 
                    className="w-full border-white/10 hover:bg-white/10 hover:text-white"
                    disabled={!pptAvailable}
                  >
                    {pptAvailable ? 'Download' : 'Locked'}
                  </Button>
                </a>
              ) : (
                <Button disabled variant="outline" className="w-full border-white/10 mt-auto">
                  No Template
                </Button>
              )}
            </div>
          </motion.div>

          {/* 4. SUBMISSION ACTION (Large/Wide - 2 cols) */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2">
            <ActionCard
              icon={FileText}
              iconColor="#F97316"
              title="Final Submission"
              description="Submit your project details and demo."
              highlight={submissionOpen && !hasSubmitted}
            >
              {hasSubmitted ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="text-green-500 h-6 w-6" />
                  <div>
                    <p className="text-green-400 font-semibold">Submission Received</p>
                    <p className="text-green-400/60 text-sm">Good luck with the evaluation!</p>
                  </div>
                </div>
              ) : submissionOpen ? (
                <Link href={`/events/${event?.id}/scope/submit`}>
                  <Button className="w-full bg-brand-gradient text-white font-bold h-12 text-lg hover:opacity-90 transition-opacity">
                    Submit Project Now
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Button disabled className="w-full bg-gray-800 text-gray-500 border border-gray-700 h-12">
                  {event?.submission_start && isBefore(now, new Date(event.submission_start))
                    ? `Opens ${format(new Date(event.submission_start), 'MMM d, h:mm a')}`
                    : 'Submission Closed'
                  }
                </Button>
              )}
            </ActionCard>
          </motion.div>

          {/* 5. SUBMISSION STATUS (Medium - 1 col) */}
          <motion.div variants={itemVariants} className="md:col-span-1 lg:col-span-1">
            <div className="h-full glass-card rounded-2xl p-6 flex flex-col hover:bg-white/5 transition-colors border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                  <Trophy size={24} />
                </div>
                {hasSubmitted && <Badge className="bg-green-500/20 text-green-400 border-green-500/20">Done</Badge>}
              </div>
              <h3 className="text-lg font-bold mb-2">Status</h3>
              <div className="flex-1 flex flex-col justify-center items-center text-center py-4">
                {hasSubmitted ? (
                  <>
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                      className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mb-2"
                    >
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </motion.div>
                    <p className="text-green-400 font-medium">All Set!</p>
                  </>
                ) : (
                  <>
                    <div className="h-16 w-16 rounded-full bg-gray-800 flex items-center justify-center mb-2">
                      <Clock className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="text-gray-400 text-sm">Pending Submission</p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
