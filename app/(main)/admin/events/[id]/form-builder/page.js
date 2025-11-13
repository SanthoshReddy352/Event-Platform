'use client'

// --- START OF DATA PERSISTENCE ---
import { useState, useEffect, Suspense } from 'react'
// --- END OF DATA PERSISTENCE ---
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import GradientText from '@/components/GradientText'
import FormBuilder from '@/components/FormBuilder'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

function FormBuilderContent() {
  const router = useRouter()
  const params = useParams()
  const { id } = params
  
  // --- START OF DATA PERSISTENCE ---
  const storageKey = `formBuilderFields-${id}`;

  const [fields, setFields] = useState(() => {
    if (typeof window === 'undefined') return [];
    const saved = window.sessionStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [eventName, setEventName] = useState('')

  // Fetch existing fields
  useEffect(() => {
    if (!id) return;

    const fetchEventData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/events/${id}`);
        const data = await response.json();
        
        if (data.success && data.event) {
          setEventName(data.event.title);
          
          // Check if data is already in storage (meaning user was editing)
          const savedData = window.sessionStorage.getItem(storageKey);
          
          if (!savedData) {
            // First load: populate from DB
            setFields(data.event.form_fields || []);
          }
          // If savedData exists, useState initializer already loaded it.
          
        } else {
          alert('Event not found');
          router.push('/admin/events');
        }
      } catch (error) {
        console.error('Error fetching event data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);
  
  // Save form data to session storage on change
  useEffect(() => {
    if (typeof window !== 'undefined' && !loading) { // Only save *after* initial load
      window.sessionStorage.setItem(storageKey, JSON.stringify(fields));
    }
  }, [fields, loading, storageKey]);
  // --- END OF DATA PERSISTENCE ---

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ form_fields: fields }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Form saved successfully!')
        
        // --- START OF DATA PERSISTENCE ---
        // Clear storage on success
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(storageKey);
        }
        // --- END OF DATA PERSISTENCE ---

      } else {
        throw new Error(data.error || 'Failed to save form')
      }
    } catch (err) {
      console.error('Save error:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-4xl font-bold">
            <GradientText>Registration Form Builder</GradientText>
          </h1>
          <p className="text-gray-400 mt-2">
            Building form for: <span className="font-semibold text-gray-200">{eventName || '...'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/events">
            <Button variant="outline">
              <ArrowLeft size={20} className="mr-2" />
              Back to Events
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            disabled={isSaving || loading}
            className="bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isSaving ? 'Saving...' : 'Save Form'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-red" />
              <p className="mt-4 text-gray-400">Loading form...</p>
            </div>
          ) : (
            <FormBuilder fields={fields} setFields={setFields} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}


export default function FormBuilderPage() {
  return (
    <ProtectedRoute>
      {/* --- START OF DATA PERSISTENCE --- */}
      <Suspense fallback={
        <div className="text-center py-12">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-red" />
        </div>
      }>
        <FormBuilderContent />
      </Suspense>
      {/* --- END OF DATA PERSISTENCE --- */}
    </ProtectedRoute>
  )
}