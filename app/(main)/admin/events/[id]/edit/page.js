'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import EventForm from '@/components/EventForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import LastWordGradientText from '@/components/LastWordGradientText'

import { fetchWithTimeout } from '@/lib/utils'

function EditEventContent() {
  const router = useRouter()
  const params = useParams()
  const { id } = params
  
  const [eventData, setEventData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const STORAGE_KEY = `editEventForm-${id}`;

  // Fetch Event Data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      
      try {
        const response = await fetch(`/api/events/${id}`);
        const data = await response.json();
        
        if (data.success && data.event) {
          setEventData(data.event);
        } else {
            alert('Failed to fetch event details');
            router.push('/admin/events');
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        alert('Error loading event data');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, router]);

  const handleSubmit = async (submissionData) => {
    setIsSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetchWithTimeout(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(submissionData),
        timeout: 15000
      })

      const data = await response.json()
      if (data.success) {
        // Clear storage on successful update
        if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(STORAGE_KEY);
        }
        alert('Event updated successfully!')
        router.push(`/admin/events/${id}/dashboard`)
      } else {
        alert(`Failed to update event: ${data.error}`) 
      }
    } catch (error) {
      console.error('Error updating event:', error)
      if (error.name === 'AbortError') {
        alert("Update timed out. Please try again.");
      } else {
        alert('An error occurred during update');
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => router.push(`/admin/events/${id}/dashboard`)}
        className="mb-4"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Events
      </Button>
      
      <h1 className="text-4xl font-bold mb-8"><LastWordGradientText>Edit Event</LastWordGradientText></h1>

      <EventForm 
        initialData={eventData} 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting}
        storageKey={STORAGE_KEY} 
      />
    </div>
  )
}

export default function EditEventPage() {
  return (
    <ProtectedRoute>
      <EditEventContent />
    </ProtectedRoute>
  )
}