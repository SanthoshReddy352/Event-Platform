'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, Loader2, Clock, Target, FileText, Download,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

export default function HackathonScopePage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState(null)
  const [scopeStatus, setScopeStatus] = useState(null)
  const [error, setError] = useState(null)

  const fetchScopeStatus = useCallback(async () => {
    if (!user || !params.id) return
    
    try {
      // Only show full loading state if we don't have data yet to prevent flashing
      if (!scopeStatus) setLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Please log in')
      }

      // 1. Fetch event details first (Added timestamp to prevent caching)
      const eventRes = await fetch(`/api/events/${params.id}?t=${Date.now()}`, {
        cache: 'no-store'
      })
      const eventData = await eventRes.json()
      
      if (!eventData.success) {
        throw new Error('Event not found')
      }
      
      setEvent(eventData.event)

      // 2. Check if this is a hackathon
      if (eventData.event.event_type !== 'hackathon') {
        router.push(`/events/${params.id}`)
        return
      }

      // REMOVED: Client-side timing check. 
      // We now rely on the server (Step 4) to determine if phases are open.
      // This prevents issues where client clock is slightly behind server clock.

      // 4. Fetch scope status
      // FIX: Added timestamp query param and cache headers to prevent browser/router caching
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
      
      setScopeStatus(scopeData)
      
    } catch (err) {
      console.error('Error fetching scope status:', err)
      // Only set error if we don't have partial data to show
      if (!scopeStatus) setError(err.message)
    } finally {
      setLoading(false)
    }
  // FIX: Depend on user?.id instead of user object to prevent re-fetching on tab focus
  }, [user?.id, params.id, router]) // Removed scopeStatus from deps to avoid loops

  useEffect(() => {
    if (!authLoading) {
      fetchScopeStatus()

      // FIX: Added polling interval to auto-update status every 30 seconds
      // This ensures windows open automatically without manual refresh
      const intervalId = setInterval(fetchScopeStatus, 30000)
      
      return () => clearInterval(intervalId)
    }
  }, [authLoading, fetchScopeStatus])

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
            <CardTitle className="text-red-500">Access Denied</CardTitle>
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

  // Ensure scopeStatus exists and has required properties
  if (!event || !scopeStatus) {
    return null
  }

  // Safely default to empty objects if properties are missing
  const phases = scopeStatus.phases || {};
  const participant = scopeStatus.participant || {};

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
        
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Problem Selection */}
          <Card className={phases.problem_selection ? 'border-green-500' : 'border-gray-500'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target size={16} className={phases.problem_selection ? 'text-green-500' : 'text-gray-400'} />
                Problem Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participant.selected_problem_id ? (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle size={20} />
                  <span className="font-semibold">Selected</span>
                </div>
              ) : phases.problem_selection ? (
                <Badge className="bg-green-500">Open Now</Badge>
              ) : (
                <Badge variant="outline">Closed</Badge>
              )}
            </CardContent>
          </Card>

          {/* PPT Template */}
          <Card className={phases.ppt_available ? 'border-blue-500' : 'border-gray-500'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Download size={16} className={phases.ppt_available ? 'text-blue-500' : 'text-gray-400'} />
                PPT Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              {phases.ppt_available ? (
                <Badge className="bg-blue-500">Available</Badge>
              ) : (
                <Badge variant="outline">Not Released</Badge>
              )}
            </CardContent>
          </Card>

          {/* Submission */}
          <Card className={phases.submission_open ? 'border-orange-500' : 'border-gray-500'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText size={16} className={phases.submission_open ? 'text-orange-500' : 'text-gray-400'} />
                Final Submission
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participant.has_submitted ? (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle size={20} />
                  <span className="font-semibold">Submitted</span>
                </div>
              ) : phases.submission_open ? (
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
                {phases.ppt_available && <CheckCircle className="h-5 w-5 text-green-500" />}
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

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Problem Selection Card */}
          <Card className="hover:border-brand-red/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-brand-red" />
                Problem Statements
              </CardTitle>
              <CardDescription>
                {participant.selected_problem_id 
                  ? 'You have selected your problem statement'
                  : 'Choose your challenge'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {participant.selected_problem_id ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-500 mb-2">
                    <CheckCircle size={20} />
                    <span className="font-semibold">Problem Selected</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Your selection is locked and cannot be changed.
                  </p>
                </div>
              ) : phases.problem_selection ? (
                <>
                  <p className="text-sm text-gray-400">
                    Browse available problem statements and make your selection. Once selected, your choice is permanent.
                  </p>
                  <Link href={`/events/${params.id}/scope/problems`}>
                    <Button className="w-full bg-brand-gradient">
                      View & Select Problem
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <XCircle size={20} />
                    <span className="font-semibold">Selection Window Closed</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    The problem selection window is currently closed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PPT Template Card */}
          <Card className="hover:border-brand-red/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-brand-red" />
                PPT Template
              </CardTitle>
              <CardDescription>Presentation template for your project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {phases.ppt_available && scopeStatus.event.ppt_template_url ? (
                <>
                  <p className="text-sm text-gray-400">
                    Download the official presentation template and use it for your project.
                  </p>
                  <a href={scopeStatus.event.ppt_template_url} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </a>
                </>
              ) : phases.ppt_available && !scopeStatus.event.ppt_template_url ? (
                <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                  <p className="text-sm text-gray-400">
                    No template has been provided by the organizers.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Clock size={20} />
                    <span className="font-semibold">Not Released Yet</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    The template will be available at the scheduled release time.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Card */}
          <Card className="hover:border-brand-red/50 transition-colors md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-red" />
                Final Project Submission
              </CardTitle>
              <CardDescription>Submit your completed project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {participant.has_submitted ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-500 mb-2">
                    <CheckCircle size={20} />
                    <span className="font-semibold">Project Submitted</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Your project has been successfully submitted. Good luck!
                  </p>
                </div>
              ) : phases.submission_open ? (
                <>
                  <p className="text-sm text-gray-400">
                    The submission window is now open. Fill out the submission form with your project details.
                  </p>
                  <Link href={`/events/${params.id}/scope/submit`}>
                    <Button className="w-full bg-orange-600 hover:bg-orange-700">
                      <FileText className="h-4 w-4 mr-2" />
                      Submit Your Project
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <AlertCircle size={20} />
                    <span className="font-semibold">Submission Window Not Open</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    The submission window will open at the scheduled time.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}