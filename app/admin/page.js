'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, FileText, LogOut } from 'lucide-react'

function AdminDashboardContent() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalParticipants: 0,
  })

  useEffect(() => {
    fetchUserAndStats()
  }, [])

  const fetchUserAndStats = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    // Fetch stats
    try {
      const [eventsRes, participantsRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/participants/count'),
      ])

      const eventsData = await eventsRes.json()
      const participantsData = await participantsRes.json()

      if (eventsData.success) {
        setStats({
          totalEvents: eventsData.events.length,
          activeEvents: eventsData.events.filter(e => e.is_active).length,
          totalParticipants: participantsData.count || 0,
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.email}</p>
        </div>
        <Button onClick={handleLogout} variant="outline">
          <LogOut size={20} className="mr-2" />
          Logout
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="text-[#00629B]" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <FileText className="text-green-600" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="text-purple-600" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalParticipants}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/events')}>
          <CardHeader>
            <CardTitle>Manage Events</CardTitle>
            <CardDescription>
              Create, edit, and delete events. Build custom registration forms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/events">
              <Button className="bg-[#00629B] hover:bg-[#004d7a]">Go to Events</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>View Participants</CardTitle>
            <CardDescription>
              See all registrations and export data to CSV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Select an event from the events page to view its participants
            </p>
            <Link href="/admin/events">
              <Button variant="outline">Select Event</Button>
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
