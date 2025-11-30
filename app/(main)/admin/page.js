'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import GradientText from '@/components/GradientText'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, LogOut, TrendingUp } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import LastWordGradientText from '@/components/LastWordGradientText'

function AdminDashboardContent() {
  const router = useRouter()
  const { user, isSuperAdmin } = useAuth()
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalParticipants: 0,
    myEvents: 0, // For normal admins
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserAndStats()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isSuperAdmin])

  const fetchUserAndStats = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const eventsRes = await fetch('/api/events')
      const eventsData = await eventsRes.json()

      if (eventsData.success) {
        const allEvents = eventsData.events
        
        const myEvents = isSuperAdmin 
          ? allEvents 
          : allEvents.filter(e => e.created_by === user.id)
        
        const now = new Date();
        const activeEventsList = myEvents.filter(e => {
          const eventEndDate = e.event_end_date ? new Date(e.event_end_date) : null;
          const isCompleted = eventEndDate && now > eventEndDate;
          return e.is_active && !isCompleted; 
        });
        
        // Sum the pre-calculated approved_count from the API
        const totalParticipants = myEvents.reduce((acc, event) => {
          return acc + (event.approved_count || 0);
        }, 0);

        setStats({
          totalEvents: allEvents.length,
          activeEvents: activeEventsList.length,
          totalParticipants, 
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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
          <p className="mt-4 text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold" data-testid="admin-dashboard-title">
            <LastWordGradientText>{isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}</LastWordGradientText>
          </h1>
          <p className="text-gray-400 mt-2">Welcome back, {user?.email}</p>
          {isSuperAdmin && (
            <p className="text-sm text-brand-orange font-medium mt-1">You have full system access</p>
          )}
        </div>
        <Button onClick={handleLogout} variant="outline" data-testid="logout-button">
          <LogOut size={20} className="mr-2" />
          Logout
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card data-testid="stat-my-events">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              <LastWordGradientText>{isSuperAdmin ? 'All Events' : 'My Events'}</LastWordGradientText>
            </CardTitle>
            <Calendar className="text-brand-orange" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.myEvents}</div>
            <p className="text-xs text-gray-400 mt-1">
              <LastWordGradientText>{isSuperAdmin ? 'System-wide' : 'Created by you'}</LastWordGradientText>
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-active-events">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium"><LastWordGradientText>Active Events</LastWordGradientText></CardTitle>
            <TrendingUp className="text-green-500" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeEvents}</div>
            <p className="text-xs text-gray-400 mt-1"><LastWordGradientText>Currently running</LastWordGradientText></p>
          </CardContent>
        </Card>

        <Card data-testid="stat-total-participants">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium"><LastWordGradientText>Total Registrations</LastWordGradientText></CardTitle>
            <Users className="text-purple-400" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalParticipants}</div>
            <p className="text-xs text-gray-400 mt-1"><LastWordGradientText>Total participants</LastWordGradientText></p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/events')} data-testid="manage-events-card">
          <CardHeader>
            <CardTitle><LastWordGradientText>Manage Events</LastWordGradientText></CardTitle>
            <CardDescription>
              Create, edit, and delete events. Build custom registration forms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/events">
              <Button className="bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity" data-testid="go-to-events-button">Go to Events</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow" data-testid="view-participants-card">
          <CardHeader>
            <CardTitle><LastWordGradientText>View Participants</LastWordGradientText></CardTitle>
            <CardDescription>
              See all registrations and export data to CSV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 mb-4">
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