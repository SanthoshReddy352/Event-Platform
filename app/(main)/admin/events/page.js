'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Users, FileEdit, LayoutDashboard } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/context/AuthContext' 
import { supabase } from '@/lib/supabase/client' 
import LastWordGradientText from '@/components/LastWordGradientText'

function AdminEventsContent() {
  const router = useRouter()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const { user, isSuperAdmin } = useAuth() 

  useEffect(() => {
    if (user) {
      fetchEvents()
    }
  }, [user?.id, isSuperAdmin]) 

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      const data = await response.json()
      if (data.success) {
        const allEvents = data.events;
        if (isSuperAdmin) {
          setEvents(allEvents)
        } else {
          const myEvents = allEvents.filter(event => event.created_by === user.id);
          setEvents(myEvents);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (await response.json().then(d => d.success)) {
        fetchEvents()
      } else {
        alert('Failed to delete event')
      }
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  if (loading) return <div className="text-center py-12">Loading...</div>

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold"><LastWordGradientText>Manage Events</LastWordGradientText></h1>
          <p className="text-gray-400 mt-2">Create and manage hackathon events</p>
        </div>
        <Link href="/admin/events/new">
          <Button className="bg-brand-gradient text-white">
            <Plus size={20} className="mr-2" />
            Create Event
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-400 mb-4">No events found.</p>
            <Link href="/admin/events/new"><Button>Create Your First Event</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const canManage = isSuperAdmin || (user && event.created_by === user.id);
            const isCompleted = event.event_end_date && new Date() > new Date(event.event_end_date);
            
            return (
              <Card key={event.id} className="flex flex-col hover:border-brand-red/50 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    {/* Link to Dashboard */}
                    <Link href={`/admin/events/${event.id}`} className="hover:underline">
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                    </Link>
                    <div className="flex gap-2">
                       {event.event_type === 'hackathon' && <Badge variant="secondary">Hackathon</Badge>}
                       {event.is_active ? <Badge className="bg-green-500">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">{event.description || 'No description'}</CardDescription>
                  {event.event_date && <p className="text-sm text-gray-500 mt-2">{format(new Date(event.event_date), 'MMM dd, yyyy')}</p>}
                </CardHeader>
                
                <CardFooter className="mt-auto flex flex-col gap-2">
                  {/* Dashboard Link - Added at top */}
                  <Link href={`/admin/events/${event.id}/dashboard`} className="w-full">
                    <Button className="w-full bg-slate-900 text-white hover:bg-slate-800" disabled={!canManage}>
                        <LayoutDashboard size={16} className="mr-2" />
                        Open Dashboard
                    </Button>
                  </Link>

                  {/* Original 4-button Grid restored below */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Link href={`/admin/events/${event.id}/edit`} className="w-full">
                      <Button variant="outline" className="w-full" size="sm" disabled={!canManage}>
                        <Edit size={16} className="mr-1" />
                        Edit
                      </Button>
                    </Link>
                    
                    <Link href={`/admin/events/${event.id}/form-builder`} className="w-full">
                      <Button variant="outline" className="w-full" size="sm" disabled={!canManage}>
                        <FileEdit size={16} className="mr-1" />
                        Form
                      </Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Link href={`/admin/participants/${event.id}`} className="w-full">
                      <Button variant="outline" className="w-full" size="sm" disabled={!canManage}>
                        <Users size={16} className="mr-1" />
                        Participants
                      </Button>
                    </Link>
                    
                    <Button
                      variant="destructive"
                      className="w-full"
                      size="sm"
                      onClick={() => handleDelete(event.id)}
                      disabled={!canManage}
                    >
                      <Trash2 size={16} className="mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AdminEventsPage() {
  return <ProtectedRoute><AdminEventsContent /></ProtectedRoute>
}