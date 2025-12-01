'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import FormBuilder from '@/components/FormBuilder'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function SubmissionFormBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const { id } = params
  
  const storageKey = `submissionFormFields-${id}`
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [eventName, setEventName] = useState('')

  // Fetch Data
  useEffect(() => {
    if (!id) return

    const fetchEventData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/events/${id}`)
        const data = await response.json()
        
        if (data.success && data.event) {
          setEventName(data.event.title)
          
          // Check session storage first for unsaved work
          const savedSessionData = window.sessionStorage.getItem(storageKey)
          const parsedSessionData = savedSessionData ? JSON.parse(savedSessionData) : null

          if (parsedSessionData && parsedSessionData.length > 0) {
            setFields(parsedSessionData)
          } else {
            setFields(data.event.submission_form_fields || [])
          }
        } else {
          router.push('/admin/events')
        }
      } catch (error) {
        console.error('Error fetching event data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEventData()
  }, [id, router, storageKey])
  
  // Auto-save to Session Storage
  useEffect(() => {
    if (!loading && typeof window !== 'undefined') { 
      window.sessionStorage.setItem(storageKey, JSON.stringify(fields))
    }
  }, [fields, loading, storageKey])

  // Save to Database
  const handleSave = async () => {
    const invalidFields = fields.filter(f => !f.label || f.label.trim() === '')
    if (invalidFields.length > 0) {
      alert('Some fields are missing labels. Please fill them in before saving.')
      return
    }

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
        body: JSON.stringify({ submission_form_fields: fields }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Submission form saved successfully!')
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(storageKey)
        }
        router.refresh()
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
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6 flex justify-between items-center">
        <Link href={`/admin/events/${id}/dashboard`}>
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

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

      <Card>
        <CardHeader>
          <CardTitle>Submission Form Builder</CardTitle>
          <CardDescription>
            Design the form that participants will fill out to submit their final project for <span className="text-brand-red font-medium">{eventName}</span>.
            <br/>
            <span className="text-brand-red font-medium">Note:</span> This form will only be visible to participants during the "Submission Window" you configured.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-brand-red mb-4" />
              <p className="text-gray-400">Loading form...</p>
            </div>
          ) : (
            <FormBuilder fields={fields} setFields={setFields} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}