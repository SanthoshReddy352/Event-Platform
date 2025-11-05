'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter,
  Calendar,
  User,
  Mail,
  FileText,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/context/AuthContext'

function AdminRegistrationsContent() {
  const router = useRouter()
  const { user, isSuperAdmin } = useAuth()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // pending, approved, rejected, all
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    if (user) {
      fetchRegistrations()
    }
  }, [user, isSuperAdmin])

  const fetchRegistrations = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Fetch events to get event titles
      const eventsRes = await fetch('/api/events')
      const eventsData = await eventsRes.json()
      
      if (!eventsData.success) {
        throw new Error('Failed to fetch events')
      }
      
      const allEvents = eventsData.events
      const myEvents = isSuperAdmin 
        ? allEvents 
        : allEvents.filter(e => e.created_by === user.id)
      
      const myEventIds = myEvents.map(e => e.id)
      
      if (myEventIds.length === 0) {
        setRegistrations([])
        setLoading(false)
        return
      }
      
      // Fetch all participants for my events
      const participantPromises = myEventIds.map(eventId =>
        fetch(`/api/participants/${eventId}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }).then(res => res.json())
      )
      
      const participantResults = await Promise.all(participantPromises)
      
      // Flatten and combine with event info
      const allRegistrations = []
      participantResults.forEach((result, index) => {
        if (result.success && result.participants) {
          const eventId = myEventIds[index]
          const event = myEvents.find(e => e.id === eventId)
          
          result.participants.forEach(participant => {
            allRegistrations.push({
              ...participant,
              event_title: event?.title || 'Unknown Event',
              event_id: eventId
            })
          })
        }
      })
      
      // Sort by created_at (newest first)
      allRegistrations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      
      setRegistrations(allRegistrations)
    } catch (error) {
      console.error('Error fetching registrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (participantId) => {
    if (!confirm('Approve this registration?')) return
    
    setProcessingId(participantId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/participants/${participantId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh the list
        fetchRegistrations()
      } else {
        alert(`Failed to approve: ${data.error}`)
      }
    } catch (error) {
      console.error('Error approving registration:', error)
      alert('An error occurred')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (participantId) => {
    if (!confirm('Reject this registration? The participant can re-register later.')) return
    
    setProcessingId(participantId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/participants/${participantId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh the list
        fetchRegistrations()
      } else {
        alert(`Failed to reject: ${data.error}`)
      }
    } catch (error) {
      console.error('Error rejecting registration:', error)
      alert('An error occurred')
    } finally {
      setProcessingId(null)
    }
  }

  const getFilteredRegistrations = () => {
    if (filter === 'all') return registrations
    return registrations.filter(r => r.status === filter)
  }

  const filteredRegistrations = getFilteredRegistrations()

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00629B]"></div>
          <p className="mt-4 text-gray-600">Loading registrations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" data-testid="registrations-page-title">Review Registrations</h1>
        <p className="text-gray-600">Approve or reject participant registrations for your events</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6" data-testid="filter-buttons">
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
          className={filter === 'pending' ? 'bg-[#00629B] hover:bg-[#004d7a]' : ''}
          data-testid="filter-pending"
        >
          <Clock size={16} className="mr-2" />
          Pending ({registrations.filter(r => r.status === 'pending').length})
        </Button>
        <Button
          variant={filter === 'approved' ? 'default' : 'outline'}
          onClick={() => setFilter('approved')}
          className={filter === 'approved' ? 'bg-[#00629B] hover:bg-[#004d7a]' : ''}
          data-testid="filter-approved"
        >
          <CheckCircle size={16} className="mr-2" />
          Approved ({registrations.filter(r => r.status === 'approved').length})
        </Button>
        <Button
          variant={filter === 'rejected' ? 'default' : 'outline'}
          onClick={() => setFilter('rejected')}
          className={filter === 'rejected' ? 'bg-[#00629B] hover:bg-[#004d7a]' : ''}
          data-testid="filter-rejected"
        >
          <XCircle size={16} className="mr-2" />
          Rejected ({registrations.filter(r => r.status === 'rejected').length})
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-[#00629B] hover:bg-[#004d7a]' : ''}
          data-testid="filter-all"
        >
          <Filter size={16} className="mr-2" />
          All ({registrations.length})
        </Button>
      </div>

      {/* Registrations List */}
      {filteredRegistrations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No {filter !== 'all' ? filter : ''} registrations found</p>
            {filter !== 'all' && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setFilter('all')}
                data-testid="show-all-button"
              >
                Show All Registrations
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRegistrations.map((registration) => (
            <Card key={registration.id} className="hover:shadow-md transition-shadow" data-testid={`registration-card-${registration.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{registration.event_title}</CardTitle>
                      <Badge
                        className={
                          registration.status === 'pending'
                            ? 'bg-orange-500'
                            : registration.status === 'approved'
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }
                        data-testid={`status-badge-${registration.id}`}
                      >
                        {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {format(new Date(registration.created_at), 'MMM dd, yyyy · hh:mm a')}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Display Response Fields */}
                <div className="space-y-3 mb-4">
                  {Object.entries(registration.responses || {}).map(([key, value]) => (
                    <div key={key} className="border-l-2 border-gray-200 pl-3">
                      <p className="text-sm font-medium text-gray-700">{key}</p>
                      <p className="text-sm text-gray-900">{value || 'N/A'}</p>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                {registration.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(registration.id)}
                      disabled={processingId === registration.id}
                      data-testid={`approve-button-${registration.id}`}
                    >
                      {processingId === registration.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle size={16} className="mr-2" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(registration.id)}
                      disabled={processingId === registration.id}
                      data-testid={`reject-button-${registration.id}`}
                    >
                      {processingId === registration.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle size={16} className="mr-2" />
                      )}
                      Reject
                    </Button>
                  </div>
                )}
                
                {registration.status !== 'pending' && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      {registration.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                      {registration.reviewed_at 
                        ? format(new Date(registration.reviewed_at), 'MMM dd, yyyy · hh:mm a')
                        : 'Unknown date'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminRegistrationsPage() {
  return (
    <ProtectedRoute>
      <AdminRegistrationsContent />
    </ProtectedRoute>
  )
}
