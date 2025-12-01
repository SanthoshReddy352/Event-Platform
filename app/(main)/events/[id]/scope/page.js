'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, Loader2, Clock, Target, FileText, Download,
  CheckCircle, XCircle, AlertCircle, Lock
} from 'lucide-react'
import { format, isBefore, isAfter, isWithinInterval } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

export default function HackathonScopePage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState(null)
  const [scopeStatus, setScopeStatus] = useState(null)
  const [error, setError] = useState(null)
  
  // State to force re-render for time checks every minute
  const [now, setNow] = useState(new Date())
  
  const prevStatusRef = useRef(null)

  const fetchScopeStatus = useCallback(async () => {
    if (!user || !params.id) return
    
    try {
      if (!scopeStatus) setLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Please log in')
      }

      // 1. Fetch event details
      const eventRes = await fetch(`/api/events/${params.id}?t=${Date.now()}`, {
        cache: 'no-store'
      })
      const eventData = await eventRes.json()
      
      if (!eventData.success) {
        throw new Error('Event not found')
      }

      // --- Strict Page Access Control ---
      const currentTime = new Date()
      const eventStart = new Date(eventData.event.event_date)
      const eventEnd = new Date(eventData.event.event_end_date)

      // Block access if event hasn't started
      if (isBefore(currentTime, eventStart)) {
         setError(`The event has not started yet. Please return at ${format(eventStart, 'PPp')}.`)
         setLoading(false)
         return
      }

      // Block access if event has ended
      if (isAfter(currentTime, eventEnd)) {
         setError("The event has concluded. This workspace is no longer accessible.")
         setLoading(false)
         return
      }
      
      setEvent(eventData.event)

      // 2. Check if this is a hackathon
      if (eventData.event.event_type !== 'hackathon') {
        router.push(`/events/${params.id}`)
        return
      }

      // 3. Fetch participant specific status
      const scopeRes = await fetch(`/api/events/${params.id}/scope-status?t=${Date.now()}`, {
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      })
      
      const scopeData = await scopeRes.json()
      
      if (!scopeData.success) {
        if (!scopeData.isApproved) {
          setError('You must be an approved participant to access the hackathon scope.')
        } else {
          setError(scopeData.error)
        }
        return
      }
      
      // Update local state
      prevStatusRef.current = scopeData
      setScopeStatus(scopeData)
      setNow(new Date()) // Sync time on fetch
      
    } catch (err) {
      console.error('Error fetching scope status:', err)
      if (!scopeStatus) setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id, params.id, router]) 

  // Initial fetch and polling
  useEffect(() => {
    if (!authLoading) {
      fetchScopeStatus()
      // Poll every 30 seconds for status updates
      const intervalId = setInterval(fetchScopeStatus, 30000)
      return () => clearInterval(intervalId)
    }
  }, [authLoading, fetchScopeStatus])

  // Update 'now' every second for real-time button states
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // --- Helper Functions for Time-Based Access ---
  const isProblemSelectionActive = () => {
    if (!event || !event.problem_selection_start || !event.problem_selection_end) return false
    return isWithinInterval(now, {
      start: new Date(event.problem_selection_start),
      end: new Date(event.problem_selection_end)
    })
  }

  const isPptActive = () => {
    if (!event || !event.ppt_release_time) return false
    return isAfter(now, new Date(event.ppt_release_time))
  }

  const isSubmissionActive = () => {
    if (!event || !event.submission_start || !event.submission_end) return false
    return isWithinInterval(now, {
      start: new Date(event.submission_start),
      end: new Date(event.submission_end)
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-red mx-auto" />
          <p className="mt-4 text-gray-400">Loading hackathon scope...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Access Denied
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/events/${params.id}`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Event Page
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event || !scopeStatus) return null

  const participant = scopeStatus.participant || {};
  
  // Calculated States
  const problemSelectionOpen = isProblemSelectionActive();
  const pptAvailable = isPptActive();
  const submissionOpen = isSubmissionActive();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-brand-gradient py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <Link href={`/events/${params.id}`}>
            <Button variant="ghost" className="text-white hover:bg-white/10 mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Event
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">{event.title}</h1>
          <p className="text-white/80">Hackathon Workspace</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        
        {/* Status Cards (Overview) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Problem Selection Status */}
          <Card className={problemSelectionOpen ? 'border-green-500' : 'border-gray-500'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target size={16} className={problemSelectionOpen ? 'text-green-500' : 'text-gray-400'} />
                Problem Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participant.selected_problem_id ? (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle size={20} />
                  <span className="font-semibold">Selected</span>
                </div>
              ) : problemSelectionOpen ? (
                <Badge className="bg-green-500">Open Now</Badge>
              ) : (
                <Badge variant="outline">Closed</Badge>
              )}
            </CardContent>
          </Card>

          {/* PPT Template Status */}
          <Card className={pptAvailable ? 'border-blue-500' : 'border-gray-500'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Download size={16} className={pptAvailable ? 'text-blue-500' : 'text-gray-400'} />
                PPT Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pptAvailable ? (
                <Badge className="bg-blue-500">Available</Badge>
              ) : (
                <Badge variant="outline">Not Released</Badge>
              )}
            </CardContent>
          </Card>

          {/* Submission Status */}
          <Card className={submissionOpen ? 'border-orange-500' : 'border-gray-500'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText size={16} className={submissionOpen ? 'text-orange-500' : 'text-gray-400'} />
                Final Submission
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participant.has_submitted ? (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle size={20} />
                  <span className="font-semibold">Submitted</span>
                </div>
              ) : submissionOpen ? (
                <Badge className="bg-orange-500">Open Now</Badge>
              ) : (
                <Badge variant="outline">Not Open</Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-red" />
              Hackathon Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Problem Selection</span>
                {participant.selected_problem_id && <CheckCircle className="h-5 w-5 text-green-500" />}
              </div>
              {event.problem_selection_start && event.problem_selection_end && (
                <p className="text-sm text-gray-400">
                  {format(new Date(event.problem_selection_start), 'PPp')} - {format(new Date(event.problem_selection_end), 'PPp')}
                </p>
              )}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">PPT Template Release</span>
                {pptAvailable && <CheckCircle className="h-5 w-5 text-green-500" />}
              </div>
              {event.ppt_release_time && (
                <p className="text-sm text-gray-400">{format(new Date(event.ppt_release_time), 'PPp')}</p>
              )}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Final Submission</span>
                {participant.has_submitted && <CheckCircle className="h-5 w-5 text-green-500" />}
              </div>
              {event.submission_start && event.submission_end && (
                <p className="text-sm text-gray-400">
                  {format(new Date(event.submission_start), 'PPp')} - {format(new Date(event.submission_end), 'PPp')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Cards with Logic for Admin-Set Times */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Problem Selection Action */}
          <Card className="hover:border-brand-red/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-brand-red" />
                Problem Statements
              </CardTitle>
              <CardDescription>
                {participant.selected_problem_id 
                  ? 'You have selected your problem statement'
                  : 'Choose your challenge for the hackathon'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Browse available problem statements and make your selection. Once selected, your choice is permanent.
              </p>
              
              <Link href={problemSelectionOpen && !participant.selected_problem_id ? `/events/${params.id}/scope/problems` : '#'}>
                <Button 
                    className="w-full bg-brand-gradient"
                    disabled={!problemSelectionOpen || participant.selected_problem_id}
                >
                    {participant.selected_problem_id 
                        ? "Problem Selected" 
                        : !problemSelectionOpen 
                            ? "Selection Window Closed" 
                            : "View & Select Problem"
                    }
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* PPT Template Action */}
          <Card className="hover:border-brand-red/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-brand-red" />
                PPT Template
              </CardTitle>
              <CardDescription>Official presentation template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                 {pptAvailable 
                    ? "Download the official presentation template and use it for your project."
                    : "The template will be available for download at the scheduled release time."
                 }
              </p>

              {scopeStatus.event.ppt_template_url ? (
                  <a 
                    href={pptAvailable ? scopeStatus.event.ppt_template_url : '#'} 
                    target={pptAvailable ? "_blank" : undefined} 
                    rel="noopener noreferrer" 
                    className="block"
                  >
                    <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={!pptAvailable}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {pptAvailable ? "Download Template" : "Not Released Yet"}
                    </Button>
                  </a>
              ) : (
                  <Button disabled variant="outline" className="w-full">
                      No Template Uploaded
                  </Button>
              )}
            </CardContent>
          </Card>

          {/* Submission Action */}
          <Card className="hover:border-brand-red/50 transition-colors md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-red" />
                Final Project Submission
              </CardTitle>
              <CardDescription>Submit your completed project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                {participant.has_submitted 
                    ? "Your project has been successfully submitted."
                    : "The submission window is now open. Fill out the submission form with your project details."
                }
              </p>

              <Link href={submissionOpen && !participant.has_submitted ? `/events/${params.id}/scope/submit` : '#'}>
                <Button 
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    disabled={!submissionOpen || participant.has_submitted}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {participant.has_submitted 
                    ? "Project Submitted" 
                    : !submissionOpen 
                        ? "Submission Window Closed" 
                        : "Submit Your Project"
                  }
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}