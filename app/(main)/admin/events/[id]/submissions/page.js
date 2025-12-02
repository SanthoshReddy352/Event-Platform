'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card' 
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Download, ShieldAlert, Loader2, FileText, ExternalLink } from 'lucide-react' 
import { format } from 'date-fns'
import { useAuth } from '@/context/AuthContext' 
import { supabase } from '@/lib/supabase/client' 

function SubmissionsContent() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dynamicFields, setDynamicFields] = useState([]) 
  const { user, isSuperAdmin, loading: authLoading } = useAuth() 

  const fixedHeaders = [
    { label: 'S.No', key: 'index', className: 'w-12' }, 
    { label: 'Submission Date', key: 'submitted_at', className: 'w-40' },
    { label: 'Email', key: 'participant_email', className: 'w-48' }
  ];
  
  const allHeaders = [
    ...fixedHeaders,
    ...dynamicFields 
  ];

  const fetchData = useCallback(async () => {
    if (!params.id || !user) return; 
    
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("User not authenticated");
      }
      
      // 1. Fetch Event
      const eventResponse = await fetch(`/api/events/${params.id}`, {
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
        return; 
      }

      // 3. Fetch Participants with Submissions
      // We can reuse the participants API or fetch directly from supabase if API doesn't support filtering by submission
      // For now, let's fetch all participants and filter client-side as we did in participants page, 
      // but we need to ensure we get submission_data. 
      // The participants page API likely returns submission_data as seen in scope/page.js
      
      const participantsResponse = await fetch(`/api/participants/${params.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const participantsData = await participantsResponse.json();

      if (!participantsData.success) {
        throw new Error(participantsData.error || "Failed to fetch participants");
      }

      // 4. Filter for participants who have submitted
      const submittedParticipants = participantsData.participants.filter(p => p.submitted_at && p.submission_data);
      setSubmissions(submittedParticipants);

      // 5. Extract Dynamic Fields from Event Submission Form Fields
      const fields = fetchedEvent.submission_form_fields || [];
      const extractedFields = fields.map(f => ({
        label: f.label,
        key: f.id     
      }));
      setDynamicFields(extractedFields);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id, user?.id, isSuperAdmin]);

  useEffect(() => {
    if (user?.id) {
        fetchData()
    }
  }, [fetchData, user?.id])

  const getSubmissionValue = (participant, field) => {
    if (!participant.submission_data || field.key === 'index' || field.key === 'submitted_at' || field.key === 'participant_email') {
      return 'N/A';
    }
    const value = participant.submission_data[field.key];
    
    if (value === null || value === undefined) return 'N/A';
    
    // Handle URLs specifically if needed, or just stringify
    if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('www'))) {
        return (
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                Link <ExternalLink size={12} />
            </a>
        )
    }

    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const getCSVValue = (participant, field) => {
      if (!participant.submission_data) return 'N/A';
      const value = participant.submission_data[field.key];
      if (value === null || value === undefined) return 'N/A';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      return String(value);
  }

  const exportToCSV = () => {
    if (submissions.length === 0) return;

    const headers = allHeaders.map(h => `"${h.label}"`).join(',');
    
    const rows = submissions.map((participant, index) => {
      const fixedValues = [
        index + 1,
        `"${format(new Date(participant.submitted_at), 'MMM dd, yyyy HH:mm')}"`,
        `"${participant.participant_email || 'N/A'}"`
      ];
      
      const dynamicValues = dynamicFields.map(field => {
        const value = getCSVValue(participant, field);
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      
      return [...fixedValues, ...dynamicValues].join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${event?.title || 'submissions'}_submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if ((authLoading || loading) && submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
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
                    <p className="text-lg">You do not have permission to view submissions for this event.</p>
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
        onClick={() => router.push(`/admin/events/${params.id}/dashboard`)}
        className="mb-4"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Dashboard
      </Button>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-brand-red" />
            Project Submissions
          </h1>
          <p className="text-gray-400 mt-2">{event?.title}</p>
        </div>
        {submissions.length > 0 && (
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

      {submissions.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <p>No submissions received yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Total Submissions: {submissions.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className={`overflow-x-auto ${loading ? 'opacity-50' : ''}`}>
              <Table>
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
                  {submissions.map((participant, index) => (
                    <TableRow key={participant.id}>
                      <TableCell className="w-12">{index + 1}</TableCell>
                      <TableCell className="w-40">
                        {format(new Date(participant.submitted_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell className="w-48">
                        {participant.participant_email || 'N/A'}
                      </TableCell>
                      {dynamicFields.map((field) => (
                        <TableCell key={field.key}>
                          {getSubmissionValue(participant, field)}
                        </TableCell>
                      ))}
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

export default function SubmissionsPage() {
  return (
    <ProtectedRoute>
      <SubmissionsContent />
    </ProtectedRoute>
  )
}
