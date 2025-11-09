'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DynamicForm from '@/components/DynamicForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card' 
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ArrowLeft, Loader2, FileClock, XCircle, CheckCircle } from 'lucide-react'
import { parseISO } from 'date-fns'; 
import { formatInTimeZone } from 'date-fns-tz'; 
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client' 
import { useAuth } from '@/context/AuthContext' 

// (Helper functions formatEventDate and formatRegDate remain unchanged)
const formatEventDate = (start, end, timeZone) => {
  if (!start) return { date: 'Date TBA', time: null };
  
  const startDate = formatInTimeZone(start, timeZone, 'MMMM dd, yyyy');
  const startTime = formatInTimeZone(start, timeZone, 'hh:mm a zzz'); 
  
  if (!end) {
    return { date: startDate, time: startTime };
  }

  const endDate = formatInTimeZone(end, timeZone, 'MMMM dd, yyyy');
  const endTime = formatInTimeZone(end, timeZone, 'hh:mm a zzz');

  if (startDate === endDate) {
    return { date: startDate, time: `${formatInTimeZone(start, timeZone, 'hh:mm a')} - ${endTime}` }; 
  }
  
  return { 
    date: `${startDate} - ${endDate}`,
    time: `${startTime} - ${endTime}`
  };
}

const formatRegDate = (date, timeZone) => {
  if (!date) return 'Not specified';
  return formatInTimeZone(date, timeZone, 'MMM dd, yyyy · hh:mm a zzz'); 
}


export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true) // For event data fetch
  const [submitted, setSubmitted] = useState(false)
  
  const { user, loading: authLoading } = useAuth() 
  
  const [isRegistered, setIsRegistered] = useState(false) 
  const [registrationStatus, setRegistrationStatus] = useState(null) // 'pending', 'approved', 'rejected'
  const [regCheckLoading, setRegCheckLoading] = useState(true) 
  
  // --- START OF FIX: Use sessionStorage for form data ---
  const storageKey = `formData-${params.id}`;
  
  const [formData, setFormData] = useState(() => {
    // Initialize state from sessionStorage on component mount
    if (typeof window !== 'undefined') {
      const savedData = sessionStorage.getItem(storageKey);
      return savedData ? JSON.parse(savedData) : {};
    }
    return {};
  });

  // Create a combined setter function that updates state AND sessionStorage
  const setAndStoreFormData = (newData) => {
    if (typeof newData === 'function') {
      setFormData(prevData => {
        const updatedData = newData(prevData);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(storageKey, JSON.stringify(updatedData));
        }
        return updatedData;
      });
    } else {
      setFormData(newData);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(storageKey, JSON.stringify(newData));
      }
    }
  };
  // --- END OF FIX ---

  const checkRegistrationStatus = useCallback(async (userId, eventId) => {
      if (!userId || !eventId) {
          setIsRegistered(false)
          setRegistrationStatus(null)
          setRegCheckLoading(false)
          return
      }
      setRegCheckLoading(true)
      try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          if (sessionError) throw sessionError;

          const response = await fetch(`/api/participants/${eventId}?userId=${userId}`, {
            headers: session ? { 'Authorization': `Bearer ${session.access_token}` } : {}
          })
          const data = await response.json()
          
          if (data.success && data.participant) {
            setIsRegistered(true)
            setRegistrationStatus(data.participant.status)
          } else {
            setIsRegistered(false)
            setRegistrationStatus(null)
          }
      } catch (error) {
          console.error('Error checking registration status:', error)
          setIsRegistered(false)
          setRegistrationStatus(null)
      } finally {
          setRegCheckLoading(false)
      }
  }, [])

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

  useEffect(() => {
    if (loading || authLoading || !event) return; 

    if (user) {
        checkRegistrationStatus(user.id, event.id);
    } else {
        setIsRegistered(false);
        setRegCheckLoading(false);
    }
  }, [user, event, loading, authLoading, checkRegistrationStatus]); 

  const handleSubmit = async (submitData) => {
    if (!user) {
        alert("Authentication failed. Please log in again.")
        router.push(`/auth?redirect=${params.id}`) 
        return
    }
    
    if (isRegistered) {
        alert("You are already registered for this event.")
        return
    }
    
    if (!user.id) {
        alert("Error: Missing user ID. Please log in again.")
        router.push(`/auth?redirect=${params.id}`)
        return;
    }
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        alert('Authentication error. Please log in again.');
        return;
      }

      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          event_id: params.id,
          user_id: user.id, 
          responses: submitData, 
        }),
      })

      const data = await response.json()
      if (data.success) {
        setSubmitted(true)
        setIsRegistered(true)
        setRegistrationStatus('pending')
        // --- START OF FIX: Clear form data from state AND sessionStorage ---
        setAndStoreFormData({}); 
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(storageKey); // Explicitly remove
        }
        // --- END OF FIX ---
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

  const TIME_ZONE = 'Asia/Kolkata';
  const now = new Date();
  
  const eventStartDate = event.event_date ? parseISO(event.event_date) : null;
  const eventEndDate = event.event_end_date ? parseISO(event.event_end_date) : null;
  const regStartDate = event.registration_start ? parseISO(event.registration_start) : null;
  const regEndDate = event.registration_end ? parseISO(event.registration_end) : null;

  const { date: formattedDate, time: formattedTime } = formatEventDate(eventStartDate, eventEndDate, TIME_ZONE);
  const formattedRegStart = formatRegDate(regStartDate, TIME_ZONE);
  const formattedRegEnd = formatRegDate(regEndDate, TIME_ZONE);
  
  const isCompleted = eventEndDate && now > eventEndDate;
  const isRegNotYetOpen = regStartDate && now < regStartDate;
  
  const isRegistrationAvailable = 
    event.is_active &&
    event.registration_open &&
    regStartDate && 
    regEndDate &&
    now >= regStartDate &&
    now < regEndDate;

  let statusBadge;
  if (isCompleted) {
    statusBadge = <span className="bg-gray-500 text-white text-sm px-4 py-1 rounded-full">Completed</span>;
  } else if (isRegistrationAvailable) {
    statusBadge = <span className="bg-green-500 text-white text-sm px-4 py-1 rounded-full">Registration Open</span>;
  } else {
    statusBadge = <span className="bg-red-500 text-white text-sm px-4 py-1 rounded-full">Registration Closed</span>;
  }
  
  const registrationContent = () => {
      // --- START OF FIX: Show loader only on *initial* auth check ---
      if (authLoading) {
      // --- END OF FIX ---
          return (
              <Card>
                  <CardContent className="py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#00629B]" />
                      <p className="mt-4 text-gray-600">Checking session...</p>
                  </CardContent>
              </Card>
          )
      }
      
      if (isCompleted) {
           return (
              <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                      <CheckCircle size={48} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-semibold mb-2">Event Completed</p>
                      <p>This event has already finished.</p>
                  </CardContent>
              </Card>
          )
      }

      if (isRegistered) {
          if (registrationStatus === 'pending') {
            return (
                <Card className="border-orange-500" data-testid="registration-pending-card">
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileClock className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-orange-600">
                          Registration Under Review
                        </h2>
                        <p className="text-gray-600 mb-2">
                          Your registration for <strong>{event.title}</strong> has been submitted successfully.
                        </p>
                        <p className="text-gray-600 mb-6">
                          The event organizers are reviewing your application. You'll be notified via email once it's reviewed.
                        </p>
                        <div className="flex justify-center space-x-4">
                          <Link href="/events">
                            <Button variant="outline" data-testid="browse-more-events-button">Browse More Events</Button>
                          </Link>
                        </div>
                    </CardContent>
                </Card>
            )
          } else if (registrationStatus === 'approved') {
            return (
                <Card className="border-green-500" data-testid="registration-approved-card">
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-green-600">
                          Registration Approved! 🎉
                        </h2>
                        <p className="text-gray-600 mb-6">
                          Your registration for <strong>{event.title}</strong> has been approved. We're excited to have you join us!
                        </p>
                        <div className="flex justify-center space-x-4">
                          <Link href="/events">
                            <Button variant="outline" data-testid="browse-more-events-button">Browse More Events</Button>
                          </Link>
                        </div>
                    </CardContent>
                </Card>
            )
          } else if (registrationStatus === 'rejected') {
            return (
                <Card className="border-red-500" data-testid="registration-rejected-card">
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <XCircle className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-red-600">
                          Registration Not Approved
                        </h2>
                        <p className="text-gray-600 mb-2">
                          Unfortunately, your registration for <strong>{event.title}</strong> was not approved.
                        </p>
                        <p className="text-gray-600 mb-6">
                          You are welcome to register again or browse other events.
                        </p>
                        <div className="flex justify-center space-x-4">
                          <Button 
                            onClick={() => {
                              setIsRegistered(false)
                              setRegistrationStatus(null)
                            }}
                            className="bg-[#00629B] hover:bg-[#004d7a]"
                            data-testid="register-again-button"
                          >
                            Register Again
                          </Button>
                          <Link href="/events">
                            <Button variant="outline" data-testid="browse-more-events-button">Browse More Events</Button>
                          </Link>
                        </div>
                    </CardContent>
                </Card>
            )
          }
          
          return (
              <Card className="border-green-500">
                  <CardContent className="py-12 text-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2 text-green-600">
                        Already Registered!
                      </h2>
                      <p className="text-gray-600 mb-6">
                        You have successfully registered for {event.title}.
                      </p>
                      <div className="flex justify-center space-x-4">
                        <Link href="/events">
                          <Button variant="outline">Browse More Events</Button>
                        </Link>
                      </div>
                  </CardContent>
              </Card>
          )
      }

      if (!isRegistrationAvailable) {
          let message = 'Registration for this event is currently closed.';
          if (isRegNotYetOpen) {
            message = `Registration opens on ${formattedRegStart}.`;
          } else if (!event.registration_open) {
            message = 'Registration has been manually closed by the admin.';
          } else if (regEndDate && now > regEndDate) {
            message = 'The registration deadline has passed.';
          } else if (!regStartDate || !regEndDate) {
            message = 'Registration dates have not been set by the admin.'
          }
          
          return (
              <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                      {isRegNotYetOpen ? (
                         <FileClock size={48} className="mx-auto mb-4 text-blue-500" />
                      ) : (
                         <XCircle size={48} className="mx-auto mb-4 text-red-500" />
                      )}
                      <p className="text-lg font-semibold mb-2">Registration Closed</p>
                      <p>{message}</p>
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
              <Card className="border-orange-500" data-testid="registration-success-card">
                  <CardContent className="py-12 text-center">
                      <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileClock className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2 text-orange-600">
                        Registration Submitted Successfully!
                      </h2>
                      <p className="text-gray-600 mb-2">
                        Thank you for registering for <strong>{event.title}</strong>.
                      </p>
                      <p className="text-gray-600 mb-6">
                        Your registration is now pending approval from the event organizers. You'll receive an email notification once it's reviewed.
                      </p>
                      <div className="flex justify-center space-x-4">
                        <Link href="/events">
                          <Button variant="outline" data-testid="browse-more-events-button">Browse More Events</Button>
                        </Link>
                      </div>
                  </CardContent>
              </Card>
          )
      }

      // 6. Show Form (User logged in, registration open, not yet registered)
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Registration Form</CardTitle>
                  {/* --- START OF FIX: Add optional chaining to prevent crash --- */}
                  <CardDescription>Logged in as: {user?.email || 'Loading...'}</CardDescription>
                  {/* --- END OF FIX --- */}
              </CardHeader>
              <CardContent>
                  {/* --- START OF FIX: Show inline loader if re-checking --- */}
                  {regCheckLoading && (
                      <div className="py-12 text-center">
                          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#00629B]" />
                          <p className="mt-4 text-gray-600">Checking registration status...</p>
                      </div>
                  )}
                  
                  {/* Show form when not re-checking */
                  /* formData will be preserved from sessionStorage */
                  }
                  {!regCheckLoading && (
                      <DynamicForm
                          fields={event.form_fields || []}
                          onSubmit={handleSubmit}
                          eventId={params.id}
                          formData={formData} // Pass the state from sessionStorage
                          onFormChange={setAndStoreFormData} // Pass the setter
                      />
                  )}
                  {/* --- END OF FIX --- */}
              </CardContent>
          </Card>
      )
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
          <Link href="/events">
            <Button 
                variant="ghost" 
                className="mb-4 text-white hover:text-gray-200 hover:bg-white/10"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back to Events
            </Button>
          </Link>

          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl mb-2">{event.title}</CardTitle>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-2 text-[#00629B]" />
                      <span>{formattedDate}</span>
                    </div>
                    {formattedTime && (
                      <div className="flex items-center">
                        <Clock size={16} className="mr-2 text-[#00629B]" />
                        <span>{formattedTime}</span>
                      </div>
                    )}
                  </div>
                </div>
                {statusBadge}
              </div>
            </CardHeader>
            <CardContent>
              <Card className="mb-6 bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">Registration Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium w-20">Starts:</span>
                    <span className="text-gray-700">{formattedRegStart}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium w-20">Ends:</span>
                    <span className="text-gray-700">{formattedRegEnd}</span>
                  </div>
                </CardContent>
              </Card>
            
              <h3 className="font-bold text-xl mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {event.description || 'No description available'}
              </p>
            </CardContent>
          </Card>

          {registrationContent()}
        </div>
      </div>
    </div>
  )
}