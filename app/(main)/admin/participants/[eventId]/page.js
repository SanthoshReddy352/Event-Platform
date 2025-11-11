'use client'

import { useState, useEffect, useCallback } from 'react' // Added useCallback
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card' 
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Download, ShieldAlert, Loader2 } from 'lucide-react' 
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

  // --- START OF FIX: Define headers *before* they are used ---
  const fixedHeaders = [
    { label: 'S.No', key: 'index', className: 'w-12' }, 
    { label: 'Registration Date', key: 'created_at', className: 'w-40' }
  ];
  
  // This will be populated by fetchData
  const allHeaders = [
    ...fixedHeaders,
    ...dynamicFields 
  ];
  // --- END OF FIX ---

  // --- START OF FIX: Implemented fetchData ---
  const fetchData = useCallback(async () => {
    if (!params.eventId || !user) return; // Wait for user and eventId
    
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("User not authenticated");
      }
      
      // 1. Fetch Event (to get title, form_fields, and permissions)
      const eventResponse = await fetch(`/api/events/${params.eventId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const eventData = await eventResponse.json();

      if (!eventData.success) {
        throw new Error(eventData.error || "Failed to fetch event");
      }
      
      const fetchedEvent = eventData.event;
      setEvent(fetchedEvent);
      
      // 2. Check permissions
      const canManage = fetchedEvent && user && (isSuperAdmin || fetchedEvent.created_by === user.id);
      if (!canManage) {
        setLoading(false);
        return; // The component will render the "Access Denied" message
      }

      // 3. Fetch Participants
      const participantsResponse = await fetch(`/api/participants/${params.eventId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const participantsData = await participantsResponse.json();

      if (!participantsData.success) {
        throw new Error(participantsData.error || "Failed to fetch participants");
      }

      // 4. Filter for "approved" participants
      const approvedParticipants = participantsData.participants.filter(p => p.status === 'approved');
      setParticipants(approvedParticipants);

      // 5. Extract Dynamic Fields from the event's form
      const fields = fetchedEvent.form_fields || [];
      const extractedFields = fields.map(f => ({
        label: f.label, // The human-readable name
        key: f.id      // The ID used as a key in the 'responses' JSON
      }));
      setDynamicFields(extractedFields);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [params.eventId, user, isSuperAdmin]); // Dependencies
  // --- END OF FIX ---

  useEffect(() => {
    fetchData()
  }, [fetchData]) // useEffect now depends on the stable useCallback

  // --- START OF FIX: Implemented getParticipantResponseValue ---
  const getParticipantResponseValue = (participant, field) => {
    if (!participant.responses || field.key === 'index' || field.key === 'created_at') {
      return 'N/A';
    }
    const value = participant.responses[field.key];
    
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };
  // --- END OF FIX ---

  // --- START OF FIX: Implemented exportToCSV ---
  const exportToCSV = () => {
    if (participants.length === 0) return;

    // Use the labels from allHeaders for the CSV header row
    const headers = allHeaders.map(h => `"${h.label}"`).join(',');
    
    const rows = participants.map((participant, index) => {
      // Manually create fixed column values
      const fixedValues = [
        index + 1,
        `"${format(new Date(participant.created_at), 'MMM dd, yyyy')}"`
      ];
      
      // Get dynamic column values by iterating over dynamicFields
      const dynamicValues = dynamicFields.map(field => {
        const value = getParticipantResponseValue(participant, field);
        // Escape quotes by doubling them
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      
      return [...fixedValues, ...dynamicValues].join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${event?.title || 'participants'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  // --- END OF FIX ---

  if ((authLoading || loading) && participants.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
      </div>
    )
  }

  const canManage = event && user && (isSuperAdmin || event.created_by === user.id);
  if (!loading && !authLoading && event && !canManage) {
    // (Unchanged)
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
                    <p className="text-lg">You do not have permission to view participants for this event.</p>
                    <Button onClick={() => router.push('/admin/events')} className="mt-4" variant="outline">
                        Back to Events
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }
  
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
          <p className="text-gray-400 mt-2">{event?.title}</p>
        </div>
        {participants.length > 0 && (
          <Button
            onClick={exportToCSV}
            className="bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={20} className="mr-2 animate-spin" />
            ) : (
              <Download size={20} className="mr-2" />
            )}
            {loading ? 'Refreshing...' : 'Export CSV'}
          </Button>
        )}
      </div>

      {participants.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <p>No approved participants yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Total Approved Registrations: {participants.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className={`overflow-x-auto ${loading ? 'opacity-50' : ''}`}>
              <Table>
                {/* --- START OF FIX: Use allHeaders for TableHeader --- */}
                <TableHeader>
                  <TableRow>
                    {allHeaders.map((header) => (
                      <TableHead key={header.key} className={header.className}>
                        {header.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant, index) => (
                    <TableRow key={participant.id}>
                      <TableCell className="w-12">{index + 1}</TableCell>
                      <TableCell className="w-40">
                        {format(new Date(participant.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      {dynamicFields.map((field) => (
                        <TableCell key={field.key}>
                          {getParticipantResponseValue(participant, field)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
                {/* --- END OF FIX --- */}
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