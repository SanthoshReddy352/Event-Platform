'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card' 
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
// --- START OF FIX: Import Loader2 ---
import { ArrowLeft, Download, ShieldAlert, Loader2 } from 'lucide-react' 
// --- END OF FIX ---
import { format } from 'date-fns'
import { useAuth } from '@/context/AuthContext' 
import { supabase } from '@/lib/supabase/client' 

function ParticipantsContent() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [dynamicFields, setDynamicFields] = useState([]) 
  const { user, isSuperAdmin, loading: authLoading } = useAuth() 

  useEffect(() => {
    if (params.eventId && user) { 
      fetchData()
    }
  }, [params.eventId, user]) 

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
          throw new Error("User not authenticated");
      }
      
      const authHeader = { 'Authorization': `Bearer ${session.access_token}` };

      const [eventRes, participantsRes] = await Promise.all([
        fetch(`/api/events/${params.eventId}`), 
        fetch(`/api/participants/${params.eventId}`, { headers: authHeader }), 
      ])

      const eventData = await eventRes.json()
      const participantsData = await participantsRes.json()
      
      let fields = [];
      
      if (eventData.success && eventData.event) {
          setEvent(eventData.event)
          fields = eventData.event.form_fields || []
      }
      
      if (participantsRes.status === 403) {
          console.warn("Access denied to participants list.");
          setLoading(false);
          return; 
      }

      if (participantsData.success && participantsData.participants) {
          const approvedParticipants = participantsData.participants.filter(
            (p) => p.status === 'approved'
          );
          setParticipants(approvedParticipants);
      }
      
      setDynamicFields(fields.map(f => ({ label: f.label, id: f.id })));

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getParticipantResponseValue = (participant, field) => {
      if (!participant.responses) {
        return undefined; 
      }
      
      let value = participant.responses[field.id];
      
      if (value === undefined) {
           value = participant.responses[field.label];
      }
      
      return value;
  };

  const exportToCSV = () => {
    if (participants.length === 0) {
      alert('No approved participants to export')
      return
    }

    const headers = ['S.No', 'Registration Date', ...dynamicFields.map(f => f.label)] 
    
    const rows = participants.map((p, index) => {
      const row = [
        index + 1,
        new Date(p.created_at).toLocaleString(),
      ]
      
      dynamicFields.forEach((field) => {
        let value = getParticipantResponseValue(p, field) || '';
        
        if (typeof value === 'boolean') {
             value = value ? 'Yes' : 'No';
        }

        row.push(value)
      })
      
      return row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    })

    const csvContent = [
      headers.join(','),
      ...rows,
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event?.title || 'event'}-participants.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // --- START OF FIX: Modified loading logic ---
  // Only show full-page loader if BOTH auth is loading OR
  // we are data-loading AND have no participants yet.
  if ((authLoading || loading) && participants.length === 0) {
  // --- END OF FIX ---
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00629B]"></div>
      </div>
    )
  }

  const canManage = event && user && (isSuperAdmin || event.created_by === user.id);
  if (!loading && !authLoading && event && !canManage) {
    return (
        <div className="container mx-auto px-4 py-12 max-w-3xl">
            <Card className="border-red-500">
                <CardHeader>
                    <CardTitle className="text-red-600 flex items-center">
                        <ShieldAlert className="mr-2" />
                        Access Denied
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg">You do not have permission to view participants for this event. Only the event creator or a super admin can access this list.</p>
                    <Button onClick={() => router.push('/admin/events')} className="mt-4" variant="outline">
                        Back to Events
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }
  
  const fixedHeaders = [
    { label: 'S.No', key: 'index', className: 'w-12' }, 
    { label: 'Registration Date', key: 'created_at', className: 'w-40' }
  ];
  
  const allHeaders = [
    ...fixedHeaders,
    ...dynamicFields 
  ];


  return (
    <div className="container mx-auto px-4 py-12">
      <Button
        variant="ghost"
        onClick={() => router.push('/admin/events')}
        className="mb-4"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Events
      </Button>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Participants</h1>
          <p className="text-gray-600 mt-2">{event?.title}</p>
        </div>
        {participants.length > 0 && (
          <Button
            onClick={exportToCSV}
            className="bg-[#00629B] hover:bg-[#004d7a]"
            // --- START OF FIX: Disable button while re-loading ---
            disabled={loading}
            // --- END OF FIX ---
          >
            {/* --- START OF FIX: Show inline loader --- */}
            {loading ? (
              <Loader2 size={20} className="mr-2 animate-spin" />
            ) : (
              <Download size={20} className="mr-2" />
            )}
            {loading ? 'Refreshing...' : 'Export CSV'}
            {/* --- END OF FIX --- */}
          </Button>
        )}
      </div>

      {/* This part is now safe. If `loading` is true but `participants.length > 0`,
        the list will remain on-screen, and only the "Export" button will show a spinner.
      */}
      {participants.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>No approved participants yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Total Approved Registrations: {participants.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* --- START OF FIX: Show opacity if loading --- */}
            <div className={`overflow-x-auto ${loading ? 'opacity-50' : ''}`}>
            {/* --- END OF FIX --- */}
              <Table>
                <TableHeader>
                  <TableRow>
                    {allHeaders.map((header) => (
                        <TableHead key={header.id || header.key || header.label} className={header.className}>
                            {header.label}
                        </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant, index) => (
                    <TableRow key={participant.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(participant.created_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>

                      {dynamicFields.map((field) => {
                          let value = getParticipantResponseValue(participant, field);
                          
                          if (typeof value === 'boolean') {
                              value = value ? (
                                  <span className="text-green-600 font-medium">Yes</span>
                              ) : (
                                  <span className="text-red-600">No</span>
                              );
                          } else if (value === '' || value === null || value === undefined) {
                              value = <span className="text-gray-400">-</span>;
                          }

                          return (
                              <TableCell key={`${participant.id}-${field.id}`} className="text-sm">
                                  {value}
                              </TableCell>
                          );
                      })}
                      
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function ParticipantsPage() {
  return (
    <ProtectedRoute>
      <ParticipantsContent />
    </ProtectedRoute>
  )
}