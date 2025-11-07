'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, FileText, LogOut, AlertCircle, TrendingUp } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

function AdminDashboardContent() {
  const router = useRouter()
  const { user, isSuperAdmin } = useAuth()
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalParticipants: 0,
    pendingApprovals: 0,
    myEvents: 0, // For normal admins
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserAndStats()
    }
  }, [user, isSuperAdmin])

  const fetchUserAndStats = async () => {
    setLoading(true)
    try {
      // --- START OF FIX: Cleanup old pending registrations ---
      // This now runs every time the dashboard loads.
      const now = new Date(); 
      const nowISO = now.toISOString();
      try {
        // Find event IDs that have already ended
        const { data: completedEventIds, error: eventIdError } = await supabase
          .from('events')
          .select('id')
          .lt('event_end_date', nowISO); // Find events where end date is in the past

        if (eventIdError) {
          console.error('Error fetching completed event IDs:', eventIdError.message);
        } else if (completedEventIds && completedEventIds.length > 0) {
          const idsToDelete = completedEventIds.map(e => e.id);
          
          // Delete 'pending' participants for those completed events
          const { error: cleanupError } = await supabase
            .from('participants')
            .delete()
            .eq('status', 'pending') // Only delete pending ones
            .in('event_id', idsToDelete);

          if (cleanupError) {
            console.error('Error cleaning up pending registrations:', cleanupError.message);
          } else {
            console.log(`Cleaned up pending registrations for ${idsToDelete.length} completed event(s).`);
          }
        }
      } catch (cleanupErr) {
        console.error('Exception during registration cleanup:', cleanupErr.message);
      }
      // --- END OF FIX ---


      const { data: { session } } = await supabase.auth.getSession()
      
      // Fetch events
      const eventsRes = await fetch('/api/events')
      const eventsData = await eventsRes.json()

      if (eventsData.success) {
        const allEvents = eventsData.events
        
        // Filter events based on role
        const myEvents = isSuperAdmin 
          ? allEvents 
          : allEvents.filter(e => e.created_by === user.id)
        
        const myEventIds = myEvents.map(e => e.id)

        // --- START OF FIX: Correct Active Events Count ---
        const activeEventsList = myEvents.filter(e => {
          const eventEndDate = e.event_end_date ? new Date(e.event_end_date) : null;
          const isCompleted = eventEndDate && now > eventEndDate;
          // Event is active if toggle is on AND it's not completed
          return e.is_active && !isCompleted; 
        });
        // --- END OF FIX ---
        
        // Fetch participants for my events only
        let totalParticipants = 0
        let pendingApprovals = 0
        
        if (myEventIds.length > 0) {
          // Fetch all participants for my events
          const participantPromises = myEventIds.map(eventId =>
            fetch(`/api/participants/${eventId}`, {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            }).then(res => res.json())
          )
          
          const participantResults = await Promise.all(participantPromises)
          
          participantResults.forEach(result => {
            if (result.success && result.participants) {
              // --- START OF FIX: Correct participant counts ---
              // Total participants should be ONLY approved ones
              totalParticipants += result.participants.filter(p => p.status === 'approved').length;
              // Pending should be only pending
              pendingApprovals += result.participants.filter(p => p.status === 'pending').length;
              // --- END OF FIX ---
            }
          })
        }

        setStats({
          totalEvents: allEvents.length,
          activeEvents: activeEventsList.length, // Use corrected list length
          totalParticipants, // Use corrected approved count
          pendingApprovals,
          myEvents: myEvents.length,
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00629B]"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold" data-testid="admin-dashboard-title">
            {isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}
          </h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.email}</p>
          {isSuperAdmin && (
            <p className="text-sm text-[#00629B] font-medium mt-1">You have full system access</p>
          )}
        </div>
        <Button onClick={handleLogout} variant="outline" data-testid="logout-button">
          <LogOut size={20} className="mr-2" />
          Logout
        </Button>
      </div>

      {/* Pending Approvals Alert */}
      {stats.pendingApprovals > 0 && (
        <Card className="mb-6 border-orange-500 bg-orange-50" data-testid="pending-approvals-alert">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-orange-600" size={24} />
                <div>
                  <p className="font-semibold text-orange-900">
                    {stats.pendingApprovals} Registration{stats.pendingApprovals > 1 ? 's' : ''} Awaiting Approval
                  </p>
                  <p className="text-sm text-orange-700">Review and approve participant registrations</p>
                </div>
              </div>
              <Link href="/admin/registrations">
                <Button className="bg-orange-600 hover:bg-orange-700" data-testid="review-registrations-button">
                  Review Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card data-testid="stat-my-events">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {isSuperAdmin ? 'All Events' : 'My Events'}
            </CardTitle>
            <Calendar className="text-[#00629B]" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.myEvents}</div>
            <p className="text-xs text-gray-500 mt-1">
              {isSuperAdmin ? 'System-wide' : 'Created by you'}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-active-events">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <TrendingUp className="text-green-600" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeEvents}</div>
            <p className="text-xs text-gray-500 mt-1">Currently running</p>
          </CardContent>
        </Card>

        <Card data-testid="stat-total-participants">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
            <Users className="text-purple-600" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalParticipants}</div>
            {/* --- START OF FIX: Updated description --- */}
            <p className="text-xs text-gray-500 mt-1">Approved participants</p>
            {/* --- END OF FIX --- */}
          </CardContent>
        </Card>

        <Card data-testid="stat-pending-approvals" className={stats.pendingApprovals > 0 ? 'border-orange-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertCircle className={stats.pendingApprovals > 0 ? 'text-orange-600' : 'text-gray-400'} size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/events')} data-testid="manage-events-card">
          <CardHeader>
            <CardTitle>Manage Events</CardTitle>
            <CardDescription>
              Create, edit, and delete events. Build custom registration forms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/events">
              <Button className="bg-[#00629B] hover:bg-[#004d7a]" data-testid="go-to-events-button">Go to Events</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/registrations')} data-testid="review-registrations-card">
          <CardHeader>
            <CardTitle>Review Registrations</CardTitle>
            <CardDescription>
              Approve or reject pending participant registrations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/registrations">
              <Button className="bg-[#00629B] hover:bg-[#004d7a]" data-testid="go-to-registrations-button">
                Review Registrations
                {stats.pendingApprovals > 0 && (
                  <span className="ml-2 bg-orange-600 text-white text-xs px-2 py-1 rounded-full">
                    {stats.pendingApprovals}
                  </span>
                )}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow" data-testid="view-participants-card">
          <CardHeader>
            <CardTitle>View Participants</CardTitle>
            {/* --- START OF FIX: Updated description --- */}
            <CardDescription>
              See all *approved* registrations and export data to CSV.
            </CardDescription>
            {/* --- END OF FIX --- */}
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Select an event from the events page to view its participants
            </p>
            <Link href="/admin/events">
              <Button variant="outline" data-testid="select-event-button">Select Event</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute>
      <AdminDashboardContent />
    </ProtectedRoute>
  )
}