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

// Helper function to format date ranges (unchanged)
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

// Helper function to format registration dates (unchanged)
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

  // --- START OF FIX: Hold form data state in the parent ---
  const [formData, setFormData] = useState({})
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

  // --- START OF FIX: Renamed argument to avoid state collision ---
  const handleSubmit = async (submitData) => {
  // --- END OF FIX ---
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
          'Authorization': `Bearer ${session.access_token}` // Pass token
        },
        body: JSON.stringify({
          event_id: params.id,
          user_id: user.id, 
          // --- START OF FIX: Use data from argument ---
          responses: submitData,
          // --- END OF FIX ---
        }),
      })

      const data = await response.json()
      if (data.success) {
        setSubmitted(true)
        setIsRegistered(true)
        setRegistrationStatus('pending') // New registrations are pending by default
        // --- START OF FIX: Clear the form data on success ---
        setFormData({})
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

  // (All loading/status logic remains unchanged)
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
      // (All loading/status checks remain unchanged)
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
      
      if (isCompleted) { /* ... (unchanged) ... */ }
      if (isRegistered) { /* ... (unchanged) ... */ }
      if (!isRegistrationAvailable) { /* ... (unchanged) ... */ }
      if (!user) { /* ... (unchanged) ... */ }
      if (submitted) { /* ... (unchanged) ... */ }
      
      // 6. Show Form (User logged in, registration open, not yet registered)
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Registration Form</CardTitle>
                  <CardDescription>Logged in as: {user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                  {/* --- START OF FIX: Pass state and handler down --- */}
                  <DynamicForm
                      fields={event.form_fields || []}
                      onSubmit={handleSubmit}
                      eventId={params.id}
                      formData={formData}
                      onFormChange={setFormData}
                  />
                  {/* --- END OF FIX --- */}
              </CardContent>
          </Card>
      )
  }

  return (
    // (The JSX return remains unchanged)
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
              {/* Registration Timeline Card */}
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

          {/* Registration Form / Login Prompt */}
          {registrationContent()}
        </div>
      </div>
    </div>
  )
}