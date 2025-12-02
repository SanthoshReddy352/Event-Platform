'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, Edit, Users, FileEdit, Calendar, Clock, 
  CheckCircle, XCircle, AlertCircle, FileText, Target, Upload
} from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { fetchWithTimeout } from '@/lib/utils'

export default function AdminEventDashboard() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const { user, isSuperAdmin, loading: authLoading } = useAuth()

  // Cache ref to store data and prevent re-fetching on simple re-renders
  const cache = useRef({})

  const fetchData = useCallback(async () => {
    // Debugging logs
    console.log('fetchData called. Params:', params, 'User:', user?.id);

    if (!params.id) {
      console.error('No event ID found in params');
      setLoading(false);
      return;
    }

    if (!user) {
      console.log('No user found in fetchData');
      setLoading(false);
      return;
    }

    // Check cache first
    if (cache.current[params.id]) {
        console.log('Using cached dashboard data');
        setEvent(cache.current[params.id].event);
        setStats(cache.current[params.id].stats);
        setLoading(false);
        return;
    }
    
    try {
      setLoading(true)
      
      // Fetch Event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.id)
        .single()

      if (eventError) throw eventError
      
      // Check permissions
      const canManage = isSuperAdmin || eventData.created_by === user.id
      if (!canManage) {
        console.warn('User not authorized to manage this event');
        router.push('/admin/events')
        return
      }

      // Fetch Participant Stats
      const { data: participants } = await supabase
        .from('participants')
        .select('status')
        .eq('event_id', params.id)

      let newStats = { total: 0, approved: 0, pending: 0, rejected: 0 };
      if (participants) {
        const total = participants.length
        const approved = participants.filter(p => p.status === 'approved').length
        const pending = participants.filter(p => p.status === 'pending').length
        const rejected = participants.filter(p => p.status === 'rejected').length
        newStats = { total, approved, pending, rejected };
      }

      // Update State
      setEvent(eventData);
      setStats(newStats);

      // Update Cache
      cache.current[params.id] = {
          event: eventData,
          stats: newStats,
          timestamp: Date.now()
      };

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id, user, isSuperAdmin, router])

  useEffect(() => {
    console.log('Dashboard Effect. AuthLoading:', authLoading, 'User:', user?.id);
    if (!authLoading) {
      if (user?.id) {
        fetchData()
      } else {
        // Not authenticated, redirect or stop loading
        console.log('User not authenticated, stopping loading');
        setLoading(false)
      }
    }
  }, [user?.id, authLoading, fetchData])

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
        <p className="mt-4 text-gray-400">
          {authLoading ? 'Verifying access...' : 'Loading dashboard...'}
        </p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-400">Event not found</p>
        <Link href="/admin/events">
          <Button className="mt-4">Back to Events</Button>
        </Link>
      </div>
    )
  }

  const isHackathon = event.event_type === 'hackathon'
  const isMCQ = event.event_type === 'mcq'

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/events">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{event.title}</h1>
            {isHackathon && <Badge variant="secondary" className="text-sm">Hackathon</Badge>}
            {isMCQ && <Badge variant="secondary" className="text-sm">MCQ Quiz</Badge>}
            {event.is_active ? (
              <Badge className="bg-green-500">Active</Badge>
            ) : (
              <Badge variant="outline">Inactive</Badge>
            )}
          </div>
          <p className="text-gray-400 mt-1">Event Management Dashboard</p>
        </div>
        <Link href={`/events/${event.id}`} target="_blank">
          <Button variant="outline">View Public Page</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Total Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-green-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-400 flex items-center gap-2">
              <CheckCircle size={16} /> Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-400 flex items-center gap-2">
              <AlertCircle size={16} /> Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="border-red-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2">
              <XCircle size={16} /> Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Event Details */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-4">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400 w-32">Start Date:</span>
            <span className="font-medium">
              {event.event_date ? format(new Date(event.event_date), 'PPP p') : 'Not set'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400 w-32">End Date:</span>
            <span className="font-medium">
              {event.event_end_date ? format(new Date(event.event_end_date), 'PPP p') : 'Not set'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <FileEdit className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400 w-32">Registration:</span>
            <span className="font-medium">
              {event.registration_open ? (
                <Badge className="bg-green-500">Open</Badge>
              ) : (
                <Badge variant="outline">Closed</Badge>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions - Standard Event */}
      {!isHackathon && !isMCQ && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your event</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href={`/admin/events/${event.id}/edit`}>
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Edit className="h-6 w-6" />
                <span>Edit Event</span>
              </Button>
            </Link>

            <Link href={`/admin/events/${event.id}/form-builder`}>
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <FileEdit className="h-6 w-6" />
                <span>Registration Form</span>
              </Button>
            </Link>

            <Link href={`/admin/participants/${event.id}`}>
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Users className="h-6 w-6" />
                <span>View Participants</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Hackathon Management Section */}
      {isHackathon && (
        <>
          <Card className="border-brand-red/30">
            <CardHeader>
              <CardTitle className="text-brand-red">Hackathon Management</CardTitle>
              <CardDescription>Manage all aspects of your hackathon</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href={`/admin/events/${event.id}/edit`}>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                  <Edit className="h-6 w-6 text-brand-red" />
                  <span className="font-semibold">Edit Event</span>
                  <span className="text-xs text-gray-400">Basic details & timing</span>
                </Button>
              </Link>

              <Link href={`/admin/events/${event.id}/form-builder`}>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                  <FileEdit className="h-6 w-6 text-brand-red" />
                  <span className="font-semibold">Registration Form</span>
                  <span className="text-xs text-gray-400">Initial signup form</span>
                </Button>
              </Link>

              <Link href={`/admin/events/${event.id}/problems`}>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                  <Target className="h-6 w-6 text-brand-red" />
                  <span className="font-semibold">Problem Statements</span>
                  <span className="text-xs text-gray-400">Add challenges</span>
                </Button>
              </Link>

              <Link href={`/admin/events/${event.id}/submission-builder`}>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                  <Upload className="h-6 w-6 text-brand-red" />
                  <span className="font-semibold">Submission Form</span>
                  <span className="text-xs text-gray-400">Final project form</span>
                </Button>
              </Link>

              <Link href={`/admin/participants/${event.id}`}>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                  <Users className="h-6 w-6 text-brand-red" />
                  <span className="font-semibold">Participants</span>
                  <span className="text-xs text-gray-400">View & approve</span>
                </Button>
              </Link>

              <Link href={`/admin/events/${event.id}/submissions`}>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                  <FileText className="h-6 w-6 text-brand-red" />
                  <span className="font-semibold">View Submissions</span>
                  <span className="text-xs text-gray-400">Final projects</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Hackathon Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Hackathon Timeline</CardTitle>
              <CardDescription>Time-controlled phases</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="font-semibold text-brand-red">Problem Selection Window</p>
                  <div className="space-y-1 text-gray-400">
                    <p>Opens: {event.problem_selection_start ? format(new Date(event.problem_selection_start), 'PPP p') : 'Not set'}</p>
                    <p>Closes: {event.problem_selection_end ? format(new Date(event.problem_selection_end), 'PPP p') : 'Not set'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-brand-red">PPT Release</p>
                  <div className="space-y-1 text-gray-400">
                    <p>Release Time: {event.ppt_release_time ? format(new Date(event.ppt_release_time), 'PPP p') : 'Not set'}</p>
                    {event.ppt_template_url ? (
                      <a href={event.ppt_template_url} target="_blank" rel="noopener noreferrer" className="text-brand-red hover:underline">
                        View Template
                      </a>
                    ) : (
                      <p className="text-xs">No template uploaded</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <p className="font-semibold text-brand-red">Submission Window</p>
                  <div className="grid grid-cols-2 gap-4 text-gray-400">
                    <p>Opens: {event.submission_start ? format(new Date(event.submission_start), 'PPP p') : 'Not set'}</p>
                    <p>Closes: {event.submission_end ? format(new Date(event.submission_end), 'PPP p') : 'Not set'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}