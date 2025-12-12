'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import GradientText from '@/components/GradientText'
import FormBuilder from '@/components/FormBuilder'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner' // Assuming you have sonner or use alert
import LastWordGradientText from '@/components/LastWordGradientText'
import { fetchWithTimeout } from '@/lib/utils'

import { useAuth } from '@/context/AuthContext' // Import existing Auth Context

function FormBuilderContent() {
  const { session } = useAuth() // Destructure session
  const router = useRouter()
  const params = useParams()
  const { id } = params
  
  const storageKey = `formBuilderFields-${id}`;

  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [eventName, setEventName] = useState('')

  // 1. Fetch Data
  useEffect(() => {
    if (!id) return;

    const fetchEventData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/events/${id}`);
        const data = await response.json();
        
        if (data.success && data.event) {
          setEventName(data.event.title);
          
          // Logic: Check session storage first
          // If session storage has data, use it (unsaved work).
          // If session storage is empty or [], use DB data.
          const savedSessionData = window.sessionStorage.getItem(storageKey);
          const parsedSessionData = savedSessionData ? JSON.parse(savedSessionData) : null;

          if (parsedSessionData && parsedSessionData.length > 0) {
            console.log("Restoring unsaved work from session");
            setFields(parsedSessionData);
          } else {
            console.log("Loading from Database");
            setFields(data.event.form_fields || []);
          }
          
        } else {
          router.push('/admin/events');
        }
      } catch (error) {
        console.error('Error fetching event data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [id, router, storageKey]);
  
  // 2. Auto-save to Session Storage (Persistence)
  useEffect(() => {
    if (!loading && typeof window !== 'undefined') { 
      // Only save if we aren't loading, to prevent overwriting with [] on mount
      window.sessionStorage.setItem(storageKey, JSON.stringify(fields));
    }
  }, [fields, loading, storageKey]);

  // 3. Save to Database
  const handleSave = async () => {
    // Basic validation
    const invalidFields = fields.filter(f => !f.label || f.label.trim() === '');
    if (invalidFields.length > 0) {
        alert("Some fields are missing labels. Please fill them in before saving.");
        return;
    }

    setIsSaving(true)
    try {
      // [FIX] Use cached session
      if (!session) throw new Error('Not authenticated')

      const response = await fetchWithTimeout(`/api/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ form_fields: fields }),
        timeout: 15000
      })

      const data = await response.json()
      if (data.success) {
        alert('Form saved successfully!')
        // Clear storage on success so next load pulls fresh from DB
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(storageKey);
        }
        router.refresh(); // Optional: refresh to ensure sync
      } else {
        throw new Error(data.error || 'Failed to save form')
      }
    } catch (err) {
      console.error('Save error:', err)
      if (err.name === 'AbortError') {
        alert("Save timed out. Please try again.");
      } else {
        alert(`Error: ${err.message}`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <Link href={`/admin/events/${id}/dashboard`} className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft size={20} />
             </Link>
             <h1 className="text-3xl font-bold">
               <LastWordGradientText>Form Builder</LastWordGradientText>
             </h1>
          </div>
          <p className="text-gray-400">
            Editing registration form for: <span className="text-brand-red font-medium">{eventName}</span>
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || loading}
            className="bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity min-w-[140px]"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-brand-red mb-4" />
          <p className="text-gray-400">Loading your form...</p>
        </div>
      ) : (
        <FormBuilder fields={fields} setFields={setFields} />
      )}
    </div>
  )
}

export default function FormBuilderPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 mx-auto"/></div>}>
        <FormBuilderContent />
      </Suspense>
    </ProtectedRoute>
  )
} 