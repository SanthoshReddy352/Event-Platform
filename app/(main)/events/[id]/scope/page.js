'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, Loader2, Clock, Target, FileText, Download,
  CheckCircle, Lock, ChevronRight, Calendar, Trophy
} from 'lucide-react'
import { format, isBefore, isAfter, isWithinInterval, differenceInSeconds } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

// --- Helper Components ---

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
    <div className="flex flex-col items-center justify-center p-4 glass-card rounded-xl text-white min-w-[200px]">
      <span className="text-xs uppercase tracking-wider text-white/60 mb-2">{label}</span>
      <div className="flex items-end gap-2">
        <div className="text-center">
          <div className="text-2xl font-bold font-mono">{timeLeft.days}</div>
          <div className="text-[10px] text-white/40">DAYS</div>
        </div>
        <span className="text-xl font-bold mb-2">:</span>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono">{String(timeLeft.hours).padStart(2, '0')}</div>
          <div className="text-[10px] text-white/40">HRS</div>
        </div>
        <span className="text-xl font-bold mb-2">:</span>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono">{String(timeLeft.minutes).padStart(2, '0')}</div>
          <div className="text-[10px] text-white/40">MIN</div>
        </div>
        <span className="text-xl font-bold mb-2">:</span>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-brand-orange">{String(timeLeft.seconds).padStart(2, '0')}</div>
          <div className="text-[10px] text-white/40">SEC</div>
        </div>
      </div>
    </div>
  )
}

function TimelineStep({ title, date, status, isLast, index }) {
  // status: 'completed', 'active', 'upcoming'
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-green-500'
      case 'active': return 'bg-brand-orange text-brand-orange animate-pulse'
      default: return 'bg-gray-700 text-gray-500'
    }
  }

  return (
    <div className={`flex md:items-center flex-1 ${isLast ? 'md:flex-none' : ''} flex-col md:flex-row relative`}>
      {/* Circle & Line Container */}
      <div className="flex flex-col md:flex-row items-center">
        {/* Circle */}
        <div className={`w-4 h-4 rounded-full border-2 border-current z-10 ${getStatusColor()} flex items-center justify-center shrink-0`}>
          {status === 'completed' && <div className="w-2 h-2 rounded-full bg-current" />}
        </div>
        
        {/* Connecting Line (Desktop: Horizontal, Mobile: Vertical) */}
        {!isLast && (
          <>
             {/* Desktop Line */}
             <div className={`hidden md:block h-0.5 w-full mx-2 ${status === 'completed' ? 'bg-green-500/50' : 'bg-gray-800'}`} />
             {/* Mobile Line */}
             <div className={`md:hidden absolute left-[7px] top-4 bottom-0 w-0.5 h-full ${status === 'completed' ? 'bg-green-500/50' : 'bg-gray-800'}`} />
          </>
        )}
      </div>

      {/* Text Content */}
      <div className={`mt-2 md:mt-0 md:absolute md:top-8 md:left-1/2 md:-translate-x-1/2 w-max text-left md:text-center pl-8 md:pl-0 pb-8 md:pb-0`}>
        <p className={`text-sm font-semibold ${status === 'upcoming' ? 'text-gray-500' : 'text-white'}`}>{title}</p>
        {date && <p className="text-xs text-gray-500">{format(new Date(date), 'MMM d, h:mm a')}</p>}
      </div>
    </div>
  )
}

export default function HackathonScopePage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [selectedProblem, setSelectedProblem] = useState(null)
  const [error, setError] = useState(null)
  
  const [now, setNow] = useState(new Date())

  // Cache ref
  const cache = useRef({})

  // --- Main Data Fetcher ---
  const fetchScopeStatus = useCallback(async () => {
    if (!user || !params.id) return
    
    // Check cache first
    if (cache.current[params.id]) {
        const cached = cache.current[params.id];
        if (Date.now() - cached.timestamp < 30000) {
            setEvent(cached.event);
            setParticipant(cached.participant);
            setSelectedProblem(cached.selectedProblem);
            setLoading(false);
            return;
        }
    }

    try {
      if (!event) setLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Please log in')

      // 1. Fetch Event Details
      const eventRes = await fetch(`/api/events/${params.id}?t=${Date.now()}`, { cache: 'no-store' })
      const eventData = await eventRes.json()
      
      if (!eventData.success) throw new Error('Event not found')
      
      // Strict Time Checks
      const currentTime = new Date()
      const eventStart = new Date(eventData.event.event_date)
      const eventEnd = new Date(eventData.event.event_end_date)

      if (isBefore(currentTime, eventStart)) {
         setError(`The event has not started yet. Please return at ${format(eventStart, 'PPp')}.`)
         setLoading(false)
         return
      }

      if (isAfter(currentTime, eventEnd)) {
         setError("The event has concluded. This workspace is no longer accessible.")
         setLoading(false)
         return
      }

      // 2. Fetch Participant
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('id, status, selected_problem_id, submitted_at, submission_data')
        .eq('event_id', params.id)
        .eq('user_id', user.id)
        .single()

      if (participantError && participantError.code !== 'PGRST116') throw participantError

      if (!participantData) {
          setError('You are not registered for this event.')
          return
      }

      if (participantData.status !== 'approved') {
          setError('You must be an approved participant to access the hackathon scope.')
          return
      }
      
      // 3. Fetch Selected Problem Details
      let problemDetails = null;
      if (participantData.selected_problem_id) {
          const { data: problemData } = await supabase
            .from('problem_statements')
            .select('title, description')
            .eq('id', participantData.selected_problem_id)
            .single()
          
          if (problemData) problemDetails = problemData;
      }

      // Update State
      setEvent(eventData.event);
      setParticipant(participantData);
      setSelectedProblem(problemDetails);
      setNow(new Date());

      if (eventData.event.event_type !== 'hackathon') {
        router.push(`/events/${params.id}`)
        return
      }

      // Update Cache
      cache.current[params.id] = {
          event: eventData.event,
          participant: participantData,
          selectedProblem: problemDetails,
          timestamp: Date.now()
      };
      
    } catch (err) {
      console.error('Error fetching scope status:', err)
      if (!event) setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id, params.id, router]) 

  // Initial fetch
  useEffect(() => {
    if (!authLoading) fetchScopeStatus()
  }, [authLoading, fetchScopeStatus])

  // --- Realtime Listener ---
  useEffect(() => {
    if (!user || !params.id) return

    const channel = supabase
      .channel(`scope_dashboard:${params.id}:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', 
          schema: 'public',
          table: 'participants',
          filter: `event_id=eq.${params.id}`
        },
        (payload) => {
          if (payload.new) {
             setParticipant(prev => ({ ...prev, ...payload.new }))
             if (payload.new.selected_problem_id !== participant?.selected_problem_id) {
                 fetchScopeStatus() 
             }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, params.id, fetchScopeStatus, participant])

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // --- Helpers ---
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-red mx-auto" />
          <p className="mt-4 text-gray-400">Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="border-red-500/50 bg-red-950/10 max-w-md w-full glass-card">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Access Denied
            </CardTitle>
            <CardDescription className="text-red-200/70">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/events/${params.id}`}>
              <Button variant="outline" className="w-full border-red-500/30 hover:bg-red-950/30 text-red-400">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Event Page
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event || !participant) return null

  const hasSelectedProblem = !!participant.selected_problem_id;
  const hasSubmitted = !!participant.submitted_at; 
  const problemSelectionOpen = isProblemSelectionActive();
  const pptAvailable = isPptActive();
  const submissionOpen = isSubmissionActive();

  // Determine Timeline Status
  const getStepStatus = (step) => {
      if (step === 'problem') {
          if (hasSelectedProblem) return 'completed'
          if (problemSelectionOpen) return 'active'
          return 'upcoming'
      }
      if (step === 'ppt') {
          if (pptAvailable) return 'completed' // Or active if it's just a release
          if (isBefore(now, new Date(event.ppt_release_time))) return 'upcoming'
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
      countdownTarget = event.problem_selection_end
      countdownLabel = 'Problem Selection Ends In'
  } else if (!pptAvailable && event.ppt_release_time) {
      countdownTarget = event.ppt_release_time
      countdownLabel = 'PPT Template Release In'
  } else if (submissionOpen && !hasSubmitted) {
      countdownTarget = event.submission_end
      countdownLabel = 'Submission Deadline'
  } else if (hasSubmitted) {
      // Event end or results
      countdownTarget = event.event_end_date
      countdownLabel = 'Hackathon Ends In'
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand-red/30">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden bg-brand-gradient">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
        
        <div className="container mx-auto px-4 py-12 relative z-10">
          <Link href={`/events/${params.id}`}>
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 mb-6 -ml-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <div>
              <Badge className="mb-4 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md">
                Hackathon Workspace
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-2 tracking-tight">
                {event.title}
              </h1>
              <p className="text-xl text-white/80 max-w-2xl">
                Welcome, <span className="text-white font-semibold">{user.email?.split('@')[0]}</span>. 
                Your command center for innovation.
              </p>
            </div>

            {countdownTarget && (
               <CountdownTimer targetDate={countdownTarget} label={countdownLabel} />
            )}
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="container mx-auto px-4 py-12 -mt-8 relative z-20">
        
        {/* Bento Grid with Integrated Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            
            {/* 1. EVENT JOURNEY (Vertical Timeline - 1 col, spans 2 rows) */}
            <div className="md:col-span-1 lg:col-span-1 row-span-2">
                <div className="h-full glass-card rounded-2xl p-6 flex flex-col">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Calendar className="text-brand-orange" size={20} />
                        Event Journey
                    </h3>
                    
                    <div className="relative space-y-8 pl-4 flex-1">
                        {/* Vertical Line */}
                        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-white/10" />

                        {/* Step 1 */}
                        <div className="relative flex items-start gap-4">
                            <div className={`relative z-10 w-3 h-3 mt-1.5 rounded-full border-2 ${getStepStatus('problem') === 'completed' ? 'bg-green-500 border-green-500' : getStepStatus('problem') === 'active' ? 'bg-brand-orange border-brand-orange animate-pulse' : 'bg-black border-gray-600'}`} />
                            <div>
                                <p className={`text-sm font-bold ${getStepStatus('problem') === 'upcoming' ? 'text-gray-500' : 'text-white'}`}>Problem Selection</p>
                                <div className="text-xs text-gray-500 mt-1 flex flex-col gap-0.5">
                                    <span>Opens: {event.problem_selection_start ? format(new Date(event.problem_selection_start), 'MMM d, h:mm a') : 'TBA'}</span>
                                    <span>Closes: {event.problem_selection_end ? format(new Date(event.problem_selection_end), 'MMM d, h:mm a') : 'TBA'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative flex items-start gap-4">
                             <div className={`relative z-10 w-3 h-3 mt-1.5 rounded-full border-2 ${getStepStatus('ppt') === 'completed' ? 'bg-green-500 border-green-500' : getStepStatus('ppt') === 'active' ? 'bg-brand-orange border-brand-orange animate-pulse' : 'bg-black border-gray-600'}`} />
                            <div>
                                <p className={`text-sm font-bold ${getStepStatus('ppt') === 'upcoming' ? 'text-gray-500' : 'text-white'}`}>PPT Release</p>
                                <div className="text-xs text-gray-500 mt-1">
                                    <span>Released: {event.ppt_release_time ? format(new Date(event.ppt_release_time), 'MMM d, h:mm a') : 'TBA'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative flex items-start gap-4">
                             <div className={`relative z-10 w-3 h-3 mt-1.5 rounded-full border-2 ${getStepStatus('submission') === 'completed' ? 'bg-green-500 border-green-500' : getStepStatus('submission') === 'active' ? 'bg-brand-orange border-brand-orange animate-pulse' : 'bg-black border-gray-600'}`} />
                            <div>
                                <p className={`text-sm font-bold ${getStepStatus('submission') === 'upcoming' ? 'text-gray-500' : 'text-white'}`}>Final Submission</p>
                                <div className="text-xs text-gray-500 mt-1 flex flex-col gap-0.5">
                                    <span>Opens: {event.submission_start ? format(new Date(event.submission_start), 'MMM d, h:mm a') : 'TBA'}</span>
                                    <span>Closes: {event.submission_end ? format(new Date(event.submission_end), 'MMM d, h:mm a') : 'TBA'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. PROBLEM CARD (Large - 2 cols) */}
            <div className="md:col-span-2 lg:col-span-2 row-span-1">
                <div className="h-full glass-card rounded-2xl p-6 flex flex-col relative overflow-hidden group hover:border-brand-red/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Target size={120} />
                    </div>
                    
                    <div className="flex items-center justify-between mb-6">
                        <div className="p-3 rounded-xl bg-brand-red/10 text-brand-red">
                            <Target size={24} />
                        </div>
                        {hasSelectedProblem ? (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/20">Selected</Badge>
                        ) : problemSelectionOpen ? (
                            <Badge className="bg-brand-orange text-white animate-pulse">Action Required</Badge>
                        ) : (
                            <Badge variant="outline" className="text-gray-500 border-gray-700">Closed</Badge>
                        )}
                    </div>

                    <h3 className="text-2xl font-bold mb-2">Problem Statement</h3>
                    
                    {hasSelectedProblem && selectedProblem ? (
                        <div className="flex-1 flex flex-col">
                            <h4 className="text-lg font-semibold text-brand-orange mb-2">{selectedProblem.title}</h4>
                            <p className="text-gray-400 line-clamp-2 mb-4 flex-1">
                                {selectedProblem.description}
                            </p>
                            <div className="mt-auto pt-4 border-t border-white/10 flex items-center gap-2 text-green-400 text-sm">
                                <CheckCircle size={16} />
                                <span>You have locked this problem statement.</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <p className="text-gray-400 mb-6">
                                Choose the challenge you want to solve. Once selected, your choice is permanent.
                            </p>
                            <div className="mt-auto">
                                {problemSelectionOpen ? (
                                    <Link href={`/events/${params.id}/scope/problems`}>
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
                        </div>
                    )}
                </div>
            </div>

            {/* 3. PPT TEMPLATE (Medium - 1 col) */}
            <div className="md:col-span-1 lg:col-span-1">
                <div className="h-full glass-card rounded-2xl p-6 flex flex-col hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                            <Download size={24} />
                        </div>
                        {pptAvailable && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/20">New</Badge>}
                    </div>
                    <h3 className="text-lg font-bold mb-2">PPT Template</h3>
                    
                    {event.ppt_template_url ? (
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
            </div>

            {/* 4. SUBMISSION ACTION (Large/Wide - 2 cols) */}
            <div className="md:col-span-2 lg:col-span-2">
                <div className={`h-full glass-card rounded-2xl p-6 flex flex-col relative overflow-hidden ${submissionOpen && !hasSubmitted ? 'border-brand-orange/50 shadow-[0_0_30px_-10px_rgba(255,145,77,0.3)]' : ''}`}>
                     <div className="absolute top-0 right-0 p-4 opacity-5">
                        <FileText size={100} />
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-xl bg-brand-orange/10 text-brand-orange">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Final Submission</h3>
                            <p className="text-sm text-gray-400">Submit your project details and demo.</p>
                        </div>
                    </div>

                    <div className="mt-auto">
                        {hasSubmitted ? (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                                <CheckCircle className="text-green-500 h-6 w-6" />
                                <div>
                                    <p className="text-green-400 font-semibold">Submission Received</p>
                                    <p className="text-green-400/60 text-sm">Good luck with the evaluation!</p>
                                </div>
                            </div>
                        ) : submissionOpen ? (
                            <Link href={`/events/${params.id}/scope/submit`}>
                                <Button className="w-full bg-brand-gradient text-white font-bold h-12 text-lg hover:opacity-90 transition-opacity">
                                    Submit Project Now
                                    <ChevronRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                        ) : (
                            <Button disabled className="w-full bg-gray-800 text-gray-500 border border-gray-700 h-12">
                                {isBefore(now, new Date(event.submission_start || now)) 
                                    ? `Opens ${format(new Date(event.submission_start), 'MMM d, h:mm a')}`
                                    : 'Submission Closed'
                                }
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* 5. SUBMISSION STATUS (Medium - 1 col) */}
            <div className="md:col-span-1 lg:col-span-1">
                 <div className="h-full glass-card rounded-2xl p-6 flex flex-col hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                            <Trophy size={24} />
                        </div>
                        {hasSubmitted && <Badge className="bg-green-500/20 text-green-400 border-green-500/20">Done</Badge>}
                    </div>
                    <h3 className="text-lg font-bold mb-2">Status</h3>
                    <div className="flex-1 flex flex-col justify-center items-center text-center">
                        {hasSubmitted ? (
                            <>
                                <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                                    <CheckCircle className="h-8 w-8 text-green-500" />
                                </div>
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
            </div>
      </div>
    </div>
    </div>
  )
}