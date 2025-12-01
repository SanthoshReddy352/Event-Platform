'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DynamicForm from '@/components/DynamicForm'
import { 
  ArrowLeft, Loader2, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

export default function ProjectSubmissionPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [event, setEvent] = useState(null)
  const [scopeStatus, setScopeStatus] = useState(null)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const storageKey = `hackathonSubmission-${params.id}`
  const [formData, setFormData] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.sessionStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : {}
    }
    return {}
  })

  const setAndStoreFormData = (newData) => {
    setFormData(newData)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(storageKey, JSON.stringify(newData))
    }
  }

  const fetchData = useCallback(async () => {
    if (!user || !params.id) return
    
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Please log in')
      }

      // Fetch event
      const eventRes = await fetch(`/api/events/${params.id}`)
      const eventData = await eventRes.json()
      
      if (!eventData.success) {
        throw new Error('Event not found')
      }
      
      setEvent(eventData.event)

      // Fetch scope status
      const scopeRes = await fetch(`/api/events/${params.id}/scope-status`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      
      const scopeData = await scopeRes.json()
      
      if (!scopeData.success) {
        setError(scopeData.error || 'Access denied')
        return
      }
      
      setScopeStatus(scopeData)

      // Check if already submitted
      if (scopeData.participant.has_submitted) {
        setSubmitted(true)
      }

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, params.id])

  useEffect(() => {
    if (!authLoading) {
      fetchData()
    }
  }, [authLoading, fetchData])

  const handleSubmit = async (submissionData) => {
    if (!confirm('Are you sure you want to submit? You can only submit once.')) {
      return
    }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/events/${params.id}/submit-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ submission_data: submissionData })
      })

      const data = await response.json()

      if (data.success) {
        setSubmitted(true)
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(storageKey)
        }
        alert('Project submitted successfully! Good luck!')
        router.push(`/events/${params.id}/scope`)
      } else {
        alert(`Submission failed: ${data.error}`)
      }
    } catch (err) {
      console.error('Submission error:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-red mx-auto" />
          <p className="mt-4 text-gray-400">Loading submission form...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Access Denied</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/events/${params.id}/scope`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Scope
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event || !scopeStatus) {
    return null
  }

  const submissionOpen = scopeStatus.phases.submission_open
  const hasSubmitted = submitted || scopeStatus.participant.has_submitted
  const submissionFormFields = event.submission_form_fields || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-brand-gradient py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link href={`/events/${params.id}/scope`}>
            <Button variant="ghost" className="text-white hover:bg-white/10 mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Scope
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Final Project Submission</h1>
          <p className="text-white/80">Submit your completed hackathon project</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        
        {/* Status Banner */}
        {hasSubmitted ? (
          <Card className="border-green-500 bg-green-500/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-500/20 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-500 mb-1">Project Submitted Successfully</h3>
                  <p className="text-sm text-gray-400">
                    Your project has been submitted. Thank you for participating! Good luck!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !submissionOpen ? (
          <Card className="border-orange-500 bg-orange-500/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="bg-orange-500/20 p-3 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-500 mb-1">Submission Window Closed</h3>
                  <p className="text-sm text-gray-400">
                    The submission window is currently closed. Please wait for the scheduled submission time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-blue-500 bg-blue-500/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500/20 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-500 mb-1">Submission Window Open</h3>
                  <p className="text-sm text-gray-400">
                    Fill out the form below to submit your project. <span className="font-semibold text-white">You can only submit once</span>, so make sure all information is correct.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!hasSubmitted && submissionOpen && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submission Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-400">
              <p>• Fill out all required fields in the form below</p>
              <p>• Double-check all your information before submitting</p>
              <p>• You can only submit <span className="text-brand-red font-semibold">ONCE</span> - there are no revisions allowed</p>
              <p>• Make sure all links are working and accessible</p>
              <p>• Your submission will be timestamped automatically</p>
            </CardContent>
          </Card>
        )}

        {/* Submission Form or Status */}
        {hasSubmitted ? (
          <Card>
            <CardHeader>
              <CardTitle>Submission Complete</CardTitle>
              <CardDescription>Your project has been successfully submitted</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-500 mb-2">Thank You!</h3>
                <p className="text-gray-400">
                  Your project submission has been recorded. The organizers will review all submissions after the deadline.
                </p>
              </div>
              
              <div className="flex justify-center">
                <Link href={`/events/${params.id}/scope`}>
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Hackathon Scope
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : !submissionOpen ? (
          <Card>
            <CardContent className="py-12 text-center">
              <XCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Submission Not Available</h3>
              <p className="text-gray-400 mb-6">
                The submission window will open at the scheduled time.
              </p>
              <Link href={`/events/${params.id}/scope`}>
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Hackathon Scope
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : submissionFormFields.length === 0 ? (
          <Card className="border-yellow-500">
            <CardHeader>
              <CardTitle className="text-yellow-500">No Submission Form Available</CardTitle>
              <CardDescription>
                The organizers have not created a submission form yet. Please check back later or contact the organizers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/events/${params.id}/scope`}>
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Hackathon Scope
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Project Submission Form</CardTitle>
              <CardDescription>
                Fill out all the required information about your project. Logged in as: {user?.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DynamicForm
                fields={submissionFormFields}
                onSubmit={handleSubmit}
                eventId={params.id}
                formData={formData}
                onFormChange={setAndStoreFormData}
                submitLabel="Submit Project"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
