'use client'

import { useEffect, useState, Suspense } from 'react' 
import { useRouter, useSearchParams } from 'next/navigation' 
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import GradientText from '@/components/GradientText'
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog'

export default function AdminRegistrationsPageWrapper() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageLoadingSpinner />}>
        <AdminRegistrationsContent />
      </Suspense>
    </ProtectedRoute>
  )
}

function PageLoadingSpinner() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
        <p className="mt-4 text-gray-400">Loading registrations...</p>
      </div>
    </div>
  );
}


function AdminRegistrationsContent() {
  const router = useRouter()
  const searchParams = useSearchParams() 
  const { user, isSuperAdmin } = useAuth()
  
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [filter, setFilter] = useState(searchParams.get('filter') || 'pending')

  const [processingId, setProcessingId] = useState(null)
  const [selectedRegistration, setSelectedRegistration] = useState(null)

  useEffect(() => {
    if (user) {
      fetchRegistrations()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isSuperAdmin]) 
  
  const handleSetFilter = (newFilter) => {
    setFilter(newFilter);
    router.push(`/admin/registrations?filter=${newFilter}`, { scroll: false });
  }

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // This endpoint is defined in your api/[[...path]]/route.js
      const response = await fetch('/api/participants/pending', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRegistrations(data.participants);
      } else {
        throw new Error(data.error || "Failed to fetch registrations");
      }
    } catch (error) {
      console.error("Error fetching registrations:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (participantId) => {
    if (processingId) return; // Prevent multiple clicks
    setProcessingId(participantId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`/api/participants/${participantId}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Registration approved!');
        fetchRegistrations(); // Refresh the list
      } else {
        throw new Error(data.error || "Failed to approve");
      }
    } catch (error) {
      console.error("Error approving:", error);
      alert(error.message);
    } finally {
      setProcessingId(null);
    }
  }

  // --- START OF CHANGE: Modify handleReject ---
  const handleReject = async (participantId) => {
    if (processingId) return; // Prevent multiple clicks
    
    // Ask for a rejection reason
    const reason = prompt('Please provide a reason for rejection (optional):');
    if (reason === null) {
      return; // Admin clicked "Cancel"
    }

    setProcessingId(participantId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`/api/participants/${participantId}/reject`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', // Specify content type
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ reason: reason }) // Send the reason in the body
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Registration rejected.');
        fetchRegistrations(); // Refresh the list
      } else {
        throw new Error(data.error || "Failed to reject");
      }
    } catch (error) {
      console.error("Error rejecting:", error);
      alert(error.message);
    } finally {
      setProcessingId(null);
    }
  }
  // --- END OF CHANGE ---

  const getFilteredRegistrations = () => {
    if (filter === 'all') return registrations
    return registrations.filter(r => r.status === filter)
  }

  const filteredRegistrations = getFilteredRegistrations()

  if (loading && registrations.length === 0) {
    return <PageLoadingSpinner />;
  }

  // --- FORM FIELDS FIX: This function is no longer needed, logic is in the dialog ---
  // const getEventForRegistration = (reg) => { ... }
  // --- END FORM FIELDS FIX ---


  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" data-testid="registrations-page-title">
          <GradientText>Review Registrations</GradientText>
        </h1>
        <p className="text-gray-400">Approve or reject participant registrations for your events</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6" data-testid="filter-buttons">
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => handleSetFilter('pending')}
          className={filter === 'pending' ? 'bg-brand-gradient text-white hover:opacity-90' : ''}
          data-testid="filter-pending"
        >
          <Clock size={16} className="mr-2" />
          Pending ({registrations.filter(r => r.status === 'pending').length})
        </Button>
        <Button
          variant={filter === 'approved' ? 'default' : 'outline'}
          onClick={() => handleSetFilter('approved')}
          className={filter === 'approved' ? 'bg-brand-gradient text-white hover:opacity-90' : ''}
          data-testid="filter-approved"
        >
          <CheckCircle size={16} className="mr-2" />
          Approved ({registrations.filter(r => r.status === 'approved').length})
        </Button>
        <Button
          variant={filter === 'rejected' ? 'default' : 'outline'}
          onClick={() => handleSetFilter('rejected')}
          className={filter === 'rejected' ? 'bg-brand-gradient text-white hover:opacity-90' : ''}
          data-testid="filter-rejected"
        >
          <XCircle size={16} className="mr-2" />
          Rejected ({registrations.filter(r => r.status === 'rejected').length})
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => handleSetFilter('all')}
          className={filter === 'all' ? 'bg-brand-gradient text-white hover:opacity-90' : ''}
          data-testid="filter-all"
        >
          <Filter size={16} className="mr-2" />
          All ({registrations.length})
        </Button>
      </div>

      {/* Registrations List */}
      {loading && (
        <div className="text-center py-4">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
      
      {filteredRegistrations.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-400">No {filter !== 'all' ? filter : ''} registrations found</p>
            {filter !== 'all' && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => handleSetFilter('all')}
                data-testid="show-all-button"
              >
                Show All Registrations
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={`space-y-4 ${loading ? 'opacity-50' : ''}`}>
          {filteredRegistrations.map((registration) => (
            <Card key={registration.id} className="transition-shadow" data-testid={`registration-card-${registration.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{registration.event?.title || 'Event Title Missing'}</CardTitle>
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
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-500">
                    Review submission details before making a decision.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedRegistration(registration)}
                    data-testid={`view-details-button-${registration.id}`}
                    disabled={loading} // Disable while re-fetching
                  >
                    View Details
                  </Button>
                </div>
                
                {/* Action Buttons */}
                {registration.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t border-border">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(registration.id)}
                      disabled={processingId === registration.id || loading}
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
                      disabled={processingId === registration.id || loading}
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
                  <div className="pt-4 border-t border-border">
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

      {/* Dialog for viewing details */}
      <Dialog 
        open={!!selectedRegistration} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedRegistration(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
            <DialogDescription>
              Reviewing submission for <strong>{selectedRegistration?.event?.title}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            
            {/* --- START OF FIX: Iterate form_fields to maintain order and show labels --- */}
            {selectedRegistration && selectedRegistration.event?.form_fields && selectedRegistration.event.form_fields.length > 0 ? (
              selectedRegistration.event.form_fields.map((field) => {
                const label = field.label;
                const value = selectedRegistration.responses[field.id]; // Get value by ID
                const isUrl = typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
                
                return (
                  <div key={field.id} className="border-l-2 border-brand-red pl-3">
                    <p className="text-sm font-medium text-gray-100">{label}</p>
                    {isUrl ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:underline break-all"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value !== null && value !== undefined && value !== '' ? String(value) : 'N/A')}
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              // Fallback if form_fields is missing or empty
              <p className="text-gray-500">
                No custom form fields were found for this event. Raw data:
                <pre className="text-xs mt-2 bg-gray-900 p-2 rounded">
                  {JSON.stringify(selectedRegistration?.responses, null, 2)}
                </pre>
              </p>
            )}
            {/* --- END OF FIX --- */}
            
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}