// app/events/[id]/page.js
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation' 
import DynamicForm from '@/components/DynamicForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card' 
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ArrowLeft, Loader2 } from 'lucide-react'
import { parseISO } from 'date-fns'; 
import { formatInTimeZone } from 'date-fns-tz'; 
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext' // IMPORT useAuth

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true) // For event data fetch
  const [submitted, setSubmitted] = useState(false)
  
  // Get user and auth loading status from the GLOBAL context
  const { user, loading: authLoading } = useAuth() 
  
  const [isRegistered, setIsRegistered] = useState(false) 
  const [regCheckLoading, setRegCheckLoading] = useState(true) // NEW: Specific loading for reg check

  // Memoized registration status checker
  const checkRegistrationStatus = useCallback(async (userId, eventId) => {
      if (!userId || !eventId) {
          setIsRegistered(false)
          setRegCheckLoading(false)
          return
      }
      
      setRegCheckLoading(true)
      try {
          const response = await fetch(`/api/participants/${eventId}?userId=${userId}`)
          const data = await response.json()
          setIsRegistered(data.success && !!data.participant)
      } catch (error) {
          console.error('Error checking registration status:', error)
          setIsRegistered(false)
      } finally {
          setRegCheckLoading(false)
      }
  }, [])

  // 1. Fetch Event Data (Runs once on mount/ID change)
  useEffect(() => {
    const fetchEventData = async () => {
        if (!params.id) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/events/${params.id}`);
            const data = await response.json();
            if (data.success) {
                setEvent(data.event);
            } else {
                setEvent(null);
            }
        } catch (error) {
            console.error('Error fetching event:', error);
            setEvent(null);
        } finally {
            setLoading(false);
        }
    };
    fetchEventData();
  }, [params.id]);

  // 2. Registration Check (Runs when auth context or event is ready)
  // This replaces the complex auth listener
  useEffect(() => {
    // Wait until event data has been fetched AND auth is no longer loading
    if (loading || authLoading || !event) return; 

    if (user) {
        checkRegistrationStatus(user.id, event.id);
    } else {
        // No user, not registered
        setIsRegistered(false);
        setRegCheckLoading(false);
    }
  }, [user, event, loading, authLoading, checkRegistrationStatus]); 

  const handleSubmit = async (formData) => {
    if (!user) {
        alert("Authentication failed. Please log in again.")
        // Pass redirect param
        router.push(`/auth?redirect=${params.id}`) 
        return
    }
    
    if (isRegistered) {
        alert("You are already registered for this event.")
        return
    }
    
    if (!user.id) {
        alert("Error: Missing user ID. Please log in again.")
        router.push(`/auth?redirect=${params.id}`) // Pass redirect param
        return;
    }
    
    try {
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: params.id,
          user_id: user.id, // Ensure user ID is passed
          responses: formData,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setSubmitted(true)
        setIsRegistered(true) 
      } else if (response.status === 409) {
        alert("Registration failed: You are already registered for this event.")
        setIsRegistered(true)
      } else {
        alert('Failed to submit registration. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('An error occurred. Please try again.')
    }
  }
  
  // Show main page loader if event or auth is still loading
  if (loading || !event) {
     return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00629B]"></div>
              <p className="mt-4 text-gray-600">Loading event...</p>
            </div>
        </div>
     )
  }

  // Determine the correct date/time formatters
  const TIME_ZONE = 'Asia/Kolkata'; 
  const eventDateObject = event?.event_date ? parseISO(event.event_date) : null; 
  
  const formattedDate = eventDateObject
    ? formatInTimeZone(eventDateObject, TIME_ZONE, 'MMMM dd, yyyy')
    : 'Date TBA'

  const formattedTime = eventDateObject
    ? formatInTimeZone(eventDateObject, TIME_ZONE, 'hh:mm a')
    : ''
    
  const registrationAvailable = event.registration_open && event.is_active;

  const registrationContent = () => {
      // Show loaders if auth or registration status is still checking
      if (authLoading || regCheckLoading) {
          return (
              <Card>
                  <CardContent className="py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#00629B]" />
                      <p className="mt-4 text-gray-600">Checking registration status...</p>
                  </CardContent>
              </Card>
          )
      }
  
      // 1. Already Registered
      if (isRegistered) {
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
                        Already Registered!
                      </h2>
                      <p className="text-gray-600 mb-6">
                        You have successfully registered for **{event.title}**.
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

      // 2. Not Logged In
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
      
      // 3. Successfully submitted in current session
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

      // 4. Show Form
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
            <Button 
                variant="ghost" 
                className="mb-4 text-white hover:text-gray-200 hover:bg-white/10"
            >
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
                        <span>{formattedTime} IST</span>
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