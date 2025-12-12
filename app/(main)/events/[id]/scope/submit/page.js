'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DynamicForm from '@/components/DynamicForm'
import { 
  ArrowLeft, Loader2, CheckCircle, XCircle, AlertTriangle, FileText, Calendar, Info
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { isWithinInterval, format } from 'date-fns'

export default function ProjectSubmissionPage() {
  const params = useParams()
  const router = useRouter()
  const { user, session, loading: authLoading } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [event, setEvent] = useState(null)
  const [scopeStatus, setScopeStatus] = useState(null)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  
  const prevStatusRef = useRef(null)

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

  // Cache ref
  const cache = useRef({})

  const fetchData = useCallback(async () => {
    if (!user || !params.id) return
    
    // Check cache first
    if (cache.current[params.id]) {
        const cached = cache.current[params.id];
        if (Date.now() - cached.timestamp < 30000) {
            setEvent(cached.event);
            setScopeStatus(cached.scopeStatus);
            prevStatusRef.current = cached.scopeStatus;
            if (cached.scopeStatus.participant?.has_submitted) {
                setSubmitted(true);
            }
            setLoading(false);
            return;
        }
    }

    try {
      if (!scopeStatus) setLoading(true)
      
      // [FIX] Use cached session
      if (!session) throw new Error('Please log in')

      // 1. Fetch event details
      const eventRes = await fetch(`/api/events/${params.id}?t=${Date.now()}`, { cache: 'no-store' })
      const eventData = await eventRes.json()
      
      if (!eventData.success) throw new Error('Event not found')
      
      // 2. Fetch scope status
      const scopeRes = await fetch(`/api/events/${params.id}/scope-status?t=${Date.now()}`, {
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      })
      
      const scopeData = await scopeRes.json()
      
      if (!scopeData.success) {
        setError(scopeData.error || 'Access denied')
        return
      }
      
      setEvent(eventData.event)
      setScopeStatus(scopeData)
      prevStatusRef.current = scopeData

      if (scopeData.participant?.has_submitted) {
        setSubmitted(true)
      }

      cache.current[params.id] = {
          event: eventData.event,
          scopeStatus: scopeData,
          timestamp: Date.now()
      };

    } catch (err) {
      console.error('Error fetching data:', err)
      if (!scopeStatus) setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id, params.id]) 

  useEffect(() => {
    if (!authLoading) fetchData()
  }, [authLoading, fetchData])

  const handleSubmit = async (submissionData) => {
    if (submitted || scopeStatus?.participant?.has_submitted) {
        alert("You have already submitted your project.")
        return
    }

    if (!confirm('Are you sure you want to submit? You can only submit once.')) return

    setSubmitting(true)
    try {
      // [FIX] Use cached session
      
      const response = await fetch(`/api/events/${params.id}/submit-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ submission_data: submissionData })
      })

      const data = await response.json()

      if (data.success) {
        setSubmitted(true)
        
        // Update cache to reflect submission immediately
        if (cache.current[params.id] && cache.current[params.id].scopeStatus) {
            cache.current[params.id].scopeStatus.participant = {
                ...cache.current[params.id].scopeStatus.participant,
                has_submitted: true,
                submitted_at: new Date().toISOString()
            }
        }

        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(storageKey)
        }
        // No alert, just UI update
        window.scrollTo({ top: 0, behavior: 'smooth' })
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-red mx-auto" />
          <p className="mt-4 text-gray-400">Loading submission portal...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="border-red-500/50 bg-red-950/10 max-w-md w-full glass-card">
          <CardHeader>
            <CardTitle className="text-red-500">Access Denied</CardTitle>
            <CardDescription className="text-red-200/70">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/events/${params.id}/scope`}>
              <Button variant="outline" className="w-full border-red-500/30 hover:bg-red-950/30 text-red-400">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Scope
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event || !scopeStatus) return null

  const submissionOpen = event?.submission_start && event?.submission_end
    ? isWithinInterval(new Date(), {
        start: new Date(event.submission_start),
        end: new Date(event.submission_end)
      })
    : scopeStatus.phases?.submission_open

  const hasSubmitted = submitted || scopeStatus.participant?.has_submitted
  const submissionFormFields = event.submission_form_fields || []

  // --- SUCCESS STATE ---
  if (hasSubmitted) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-green-500/10 blur-[100px]" />
            
            <div className="glass-card max-w-2xl w-full p-12 rounded-3xl text-center relative z-10 border-green-500/30">
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">Submission Received!</h1>
                <p className="text-xl text-gray-300 mb-8">
                    Your project has been successfully submitted to <span className="text-brand-orange">{event.title}</span>.
                </p>
                <div className="bg-white/5 rounded-xl p-6 mb-8 text-left">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Next Steps</h3>
                    <ul className="space-y-2 text-gray-300">
                        <li className="flex items-start gap-2">
                            <span className="text-green-500">•</span>
                            Wait for the judges to review your submission.
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500">•</span>
                            Keep an eye on your email for any announcements.
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500">•</span>
                            Prepare for the final presentation if shortlisted.
                        </li>
                    </ul>
                </div>
                <Link href={`/events/${params.id}/scope`}>
                    <Button className="bg-white text-black hover:bg-gray-200 font-bold px-8 py-6 text-lg rounded-xl">
                        Return to Dashboard
                    </Button>
                </Link>
            </div>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand-red/30">
      {/* Header */}
      <div className="bg-brand-gradient h-64 relative">
         <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
         <div className="container mx-auto px-4 py-8 relative z-10">
            <Link href={`/events/${params.id}/scope`}>
                <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 mb-6 -ml-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
                </Button>
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">Final Submission</h1>
            <p className="text-white/80">Showcase your hard work.</p>
         </div>
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-20 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COL: Context */}
            <div className="lg:col-span-1 space-y-6">
                {/* Status Card */}
                <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Info className="text-brand-orange" size={20} />
                        Submission Status
                    </h3>
                    
                    {!submissionOpen ? (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400">
                            <XCircle size={24} />
                            <div>
                                <p className="font-semibold">Window Closed</p>
                                <p className="text-xs opacity-80">Submissions are not currently accepted.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3 text-green-400">
                            <CheckCircle size={24} />
                            <div>
                                <p className="font-semibold">Window Open</p>
                                <p className="text-xs opacity-80">You can submit your project now.</p>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Opens</span>
                            <span className="font-mono">{event.submission_start ? format(new Date(event.submission_start), 'MMM d, HH:mm') : 'TBA'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Closes</span>
                            <span className="font-mono text-brand-orange">{event.submission_end ? format(new Date(event.submission_end), 'MMM d, HH:mm') : 'TBA'}</span>
                        </div>
                    </div>
                </div>

                {/* Guidelines */}
                <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <FileText size={80} />
                    </div>
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <FileText className="text-brand-orange" size={20} />
                        Guidelines
                    </h3>
                    <ul className="space-y-4">
                        <li className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center text-xs font-bold shrink-0">1</div>
                            <p className="text-sm text-gray-300">Fill out all required fields accurately. Double-check your links.</p>
                        </li>
                        <li className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center text-xs font-bold shrink-0">2</div>
                            <p className="text-sm text-gray-300">Ensure your demo video and repo links are <span className="text-white font-semibold">publicly accessible</span>.</p>
                        </li>
                        <li className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                            <p className="text-sm text-gray-300">You can only submit <span className="text-red-400 font-bold">ONCE</span>. No edits allowed after submission.</p>
                        </li>
                    </ul>
                </div>
            </div>

            {/* RIGHT COL: Form */}
            <div className="lg:col-span-2">
                <div className="glass-card p-8 rounded-2xl border-t-4 border-t-brand-orange">
                    {!submissionOpen ? (
                        <div className="text-center py-12">
                            <AlertTriangle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-gray-500 mb-2">Submission Locked</h2>
                            <p className="text-gray-600">Please wait for the submission window to open.</p>
                        </div>
                    ) : submissionFormFields.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-gray-500 mb-2">No Form Configured</h2>
                            <p className="text-gray-600">The organizers haven't set up the submission form yet.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold mb-2">Project Details</h2>
                                <p className="text-gray-400">Please provide all necessary information for the judges.</p>
                            </div>
                            
                            {/* 
                                Note: We are wrapping DynamicForm. 
                                Since DynamicForm likely uses standard Shadcn components, 
                                we can try to style them via global CSS or just accept the default look 
                                but wrapped in our glass card.
                            */}
                            <div className="submission-form-wrapper">
                                <DynamicForm
                                    fields={submissionFormFields}
                                    onSubmit={handleSubmit}
                                    eventId={params.id}
                                    formData={formData}
                                    onFormChange={setAndStoreFormData}
                                    submitLabel={submitting ? "Submitting..." : "Submit Project"}
                                    className="space-y-6"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  )
}