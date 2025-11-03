'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation' // Added usePathname
import DynamicForm from '@/components/DynamicForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card' 
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client' // Added supabase import

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname() // Get current pathname for redirect
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [user, setUser] = useState(null) 
  const [authLoading, setAuthLoading] = useState(true) 

  useEffect(() => {
    if (params.id) {
      fetchEvent()
    }
  }, [params.id])

  // Combined fetch and auth check
  const fetchEvent = async () => {
    try {
      // 1. Fetch Event
      const response = await fetch(`/api/events/${params.id}`)
      const data = await response.json()
      if (data.success) {
        setEvent(data.event)
      } else {
        setEvent(null)
      }

      // 2. Check Auth Status
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      // 3. Listen for Auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null)
      })

      // Cleanup subscription
      return () => {
        subscription?.unsubscribe()
      }

    } catch (error) {
      console.error('Error fetching event or session:', error)
    } finally {
      setLoading(false)
      setAuthLoading(false)
    }
  }

  const handleSubmit = async (formData) => {
    // Re-check auth before final submission
    if (!user) {
        alert("You must be logged in to register for an event.")
        // Redirect to auth page, passing the current event ID for post-login redirect
        router.push(`/auth?redirect=${params.id}`) 
        return
    }
    
    try {
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: params.id,
          responses: formData,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setSubmitted(true)
      } else {
        alert('Failed to submit registration. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('An error occurred. Please try again.')
    }
  }

  if (loading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00629B]"></div>
          <p className="mt-4 text-gray-600">Loading event details...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">Event not found</p>
            <Link href="/events">
              <Button>Back to Events</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formattedDate = event.event_date
    ? format(new Date(event.event_date), 'MMMM dd, yyyy')
    : 'Date TBA'

  const formattedTime = event.event_date
    ? format(new Date(event.event_date), 'hh:mm a')
    : ''
    
  const registrationAvailable = event.registration_open && event.is_active;

  const registrationContent = () => {
      if (!registrationAvailable) {
          return (
              <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                      <p className="text-lg font-semibold mb-2">Registration Closed</p>
                      <p>Registration for this event is currently closed.</p>
                  </CardContent>
              </Card>
          )
      }

      if (!user) {
          return (
              <Card className="border-yellow-500">
                  <CardHeader>
                    <CardTitle>Sign in to Register</CardTitle>
                    <CardDescription>You must be logged in to access the registration form for this event.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <Link href={`/auth?redirect=${params.id}`}>
                        <Button className="w-full bg-[#00629B] hover:bg-[#004d7a]">
                          Login or Register
                        </Button>
                      </Link>
                  </CardContent>
              </Card>
          )
      }
      
      if (submitted) {
          return (
              <Card className="border-green-500">
                  <CardContent className="py-12 text-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h2 className="text-2xl font-bold mb-2 text-green-600">
                        Registration Successful!
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Thank you for registering for {event.title}. We'll contact you with more details soon.
                      </p>
                      <div className="flex justify-center space-x-4">
                        <Link href="/events">
                          <Button variant="outline">Browse More Events</Button>
                        </Link>
                        <Link href="/">
                          <Button className="bg-[#00629B] hover:bg-[#004d7a]">Go Home</Button>
                        </Link>
                      </div>
                  </CardContent>
              </Card>
          )
      }


      return (
          <Card>
              <CardHeader>
                  <CardTitle>Registration Form</CardTitle>
                  <CardDescription>Logged in as: {user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                  <DynamicForm
                      fields={event.form_fields || []}
                      onSubmit={handleSubmit}
                      eventId={params.id}
                  />
              </CardContent>
          </Card>
      )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Event Banner */}
      <div className="w-full h-64 bg-gradient-to-br from-[#00629B] to-[#004d7a] relative">
        {event.banner_url && (
          <img
            src={event.banner_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link href="/events">
            <Button variant="ghost" className="mb-4 text-white hover:text-white/80">
              <ArrowLeft size={20} className="mr-2" />
              Back to Events
            </Button>
          </Link>

          {/* Event Info Card */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl mb-2">{event.title}</CardTitle>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-2 text-[#00629B]" />
                      {formattedDate}
                    </div>
                    {formattedTime && (
                      <div className="flex items-center">
                        <Clock size={16} className="mr-2 text-[#00629B]" />
                        {formattedTime}
                      </div>
                    )}
                  </div>
                </div>
                {registrationAvailable ? (
                  <span className="bg-green-500 text-white text-sm px-4 py-1 rounded-full">
                    Open
                  </span>
                ) : (
                  <span className="bg-red-500 text-white text-sm px-4 py-1 rounded-full">
                    Closed
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">
                {event.description || 'No description available'}
              </p>
            </CardContent>
          </Card>

          {/* Registration Form / Login Prompt */}
          {registrationContent()}
        </div>
      </div>
    </div>
  )
}