'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DynamicForm from '@/components/DynamicForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card' 
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ArrowLeft, Loader2, FileClock, XCircle, CheckCircle, IndianRupee } from 'lucide-react'
import { parseISO, format } from 'date-fns'; 
import { formatInTimeZone } from 'date-fns-tz'; 
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client' 
import { useAuth } from '@/context/AuthContext' 
import Script from 'next/script' // Required for Razorpay

// Helper function to format date ranges
const formatEventDate = (start, end, timeZone) => {
  if (!start) return 'Date TBA';
  
  const tz = formatInTimeZone(start, timeZone, 'zzz');
  const startDate = formatInTimeZone(start, timeZone, 'MMM dd');
  const startTime = formatInTimeZone(start, timeZone, 'hh:mm a');
  
  if (!end) {
    return `${startDate} at ${startTime} ${tz}`;
  }

  const endDate = formatInTimeZone(end, timeZone, 'MMM dd');
  const endTime = formatInTimeZone(end, timeZone, 'hh:mm a');

  if (startDate === endDate) {
    return `${startDate} · ${startTime} - ${endTime} ${tz}`;
  }
  
  return `${startDate} ${startTime} - ${endDate} ${endTime} ${tz}`;
}

// Helper function to get event status
const getEventStatus = (event) => {
  const now = new Date();
  const eventEndDate = event.event_end_date ? parseISO(event.event_end_date) : null;
  const regStartDate = event.registration_start ? parseISO(event.registration_start) : null;
  const regEndDate = event.registration_end ? parseISO(event.registration_end) : null;

  if (eventEndDate && now > eventEndDate) {
    return { text: 'Completed', color: 'bg-gray-500', icon: <CheckCircle size={16} /> };
  }
  
  if (!event.is_active) {
    return { text: 'Inactive', color: 'bg-gray-400' };
  }

  if (regStartDate && now < regStartDate) {
    return { 
      text: `Opens ${format(regStartDate, 'MMM dd')}`, 
      color: 'bg-blue-500',
      icon: <FileClock size={16} />
    };
  }

  if ((regEndDate && now > regEndDate) || !event.registration_open) {
    return { text: 'Registration Closed', color: 'bg-red-500', icon: <XCircle size={16} /> };
  }

  if (regStartDate && regEndDate && now >= regStartDate && now < regEndDate && event.registration_open) {
     return { text: 'Registration Open', color: 'bg-green-500', icon: <CheckCircle size={16} /> };
  }
  
  if (event.registration_open && !regStartDate && !regEndDate) {
     return { text: 'Registration Open', color: 'bg-green-500', icon: <CheckCircle size={16} /> };
  }

  return { text: 'Closed', color: 'bg-red-500', icon: <XCircle size={16} /> };
}


function EventDetailContent() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true) 
  const [submitted, setSubmitted] = useState(false)
  const { user, loading: authLoading } = useAuth() 
  const [isRegistered, setIsRegistered] = useState(false) 
  const [registrationStatus, setRegistrationStatus] = useState(null)
  const [regCheckLoading, setRegCheckLoading] = useState(true) 
  const storageKey = `formData-${params.id}`;
  
  const [rejectionHistory, setRejectionHistory] = useState(null);

  const [formData, setFormData] = useState(() => {
     if (typeof window !== 'undefined') {
      const saved = window.sessionStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const setAndStoreFormData = (newData) => {
    setFormData(newData);
    window.sessionStorage.setItem(storageKey, JSON.stringify(newData));
  };

  const fetchEvent = useCallback(async () => {
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
  }, [params.id]);

  const checkRegistrationStatus = useCallback(async (userId, eventId) => {
    if (!userId || !eventId) {
      setRegCheckLoading(false);
      return;
    }
    setRegCheckLoading(true);
    setRejectionHistory(null); 
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
         throw new Error("No active session");
      }

      const response = await fetch(`/api/participants/${eventId}?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      
      if (data.success && data.participants && data.participants.length > 0) {
        const mostRecent = data.participants[data.participants.length - 1];
        
        setIsRegistered(true);
        setRegistrationStatus(mostRecent.status);

        const rejected = data.participants
          .filter(p => p.status === 'rejected')
          .pop(); 

        if (rejected) {
          setRejectionHistory(rejected);
        }

      } else {
        setIsRegistered(false);
        setRegistrationStatus(null);
        setRejectionHistory(null);
      }
    } catch (error) {
      console.error("Error checking registration:", error);
      setIsRegistered(false);
      setRegistrationStatus(null);
      setRejectionHistory(null);
    } finally {
      setRegCheckLoading(false);
    }
  }, []); 

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]); 
  
  useEffect(() => {
    if (loading || authLoading || !event?.id) return; 

    if (user?.id) {
        checkRegistrationStatus(user.id, event.id);
    } else {
        setIsRegistered(false);
        setRegistrationStatus(null);
        setRegCheckLoading(false); 
        setRejectionHistory(null); 
    }
  }, [user?.id, event?.id, loading, authLoading, checkRegistrationStatus]); 

  // --- UPDATED HANDLESUBMIT TO SUPPORT RAZORPAY ---
  const handleSubmit = async (submitData) => {
    if (!user) {
        alert('You must be logged in to register.');
        return;
    }

    // 1. Check if Paid Event
    if (event.is_paid && event.registration_fee > 0) {
        try {
            // A. Create Order
            const res = await fetch("/api/razorpay/create-order", {
                method: "POST",
                body: JSON.stringify({ amount: event.registration_fee, eventId: event.id }),
            });
            const order = await res.json();
            
            if (!order.id) throw new Error("Failed to create order");

            // B. Open Razorpay
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
                amount: order.amount,
                currency: order.currency,
                name: "Event Platform", // Replace with your App Name
                description: `Registration for ${event.title}`,
                order_id: order.id,
                handler: async function (response) {
                    // C. Payment Success - Verify & Register
                    try {
                        const verifyRes = await fetch("/api/razorpay/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                                eventId: event.id,
                                userId: user.id,
                                userDetails: { email: user.email }, // Can pass user details if needed
                                responses: submitData // Pass the form answers
                            }),
                        });

                        const result = await verifyRes.json();
                        if (result.success) {
                            setSubmitted(true);
                            window.sessionStorage.removeItem(storageKey);
                            alert("Payment Successful! You are registered.");
                            // Refresh status
                            checkRegistrationStatus(user.id, event.id);
                        } else {
                            alert("Payment verification failed. Please contact support.");
                        }
                    } catch (err) {
                        console.error("Verification error", err);
                        alert("Error during verification.");
                    }
                },
                prefill: {
                    email: user.email,
                },
                theme: {
                    color: "#E11D48", // Brand Red
                },
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response){
                    alert("Payment Failed: " + response.error.description);
            });
            rzp1.open();

        } catch (error) {
            console.error("Payment initiation error:", error);
            alert("Could not start payment. Please try again.");
        }
        return; // Stop here, wait for Razorpay callback
    }
    
    // 2. Standard Free Registration
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error("No active session. Please log in again.");
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
                responses: submitData
            }),
        });
        
        const data = await response.json();

        if (data.success) {
            setSubmitted(true);
            window.sessionStorage.removeItem(storageKey); 
        } else {
            alert(`Registration failed: ${data.error}`);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert(`An error occurred: ${error.message}`);
    }
  }

  if (loading || (authLoading && !event)) {
     return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
              <p className="mt-4 text-gray-400">Loading event...</p>
            </div>
        </div>
     )
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
           <Link href="/events">
            <Button 
                variant="ghost" 
                className="mb-4"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back to Events
            </Button>
          </Link>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-red-500">Event Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">Sorry, we couldn't find the event you're looking for.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  const TIME_ZONE = 'Asia/Kolkata'; 
  const eventStartDate = event.event_date ? parseISO(event.event_date) : null;
  const eventEndDate = event.event_end_date ? parseISO(event.event_end_date) : null;
  const regStartDate = event.registration_start ? parseISO(event.registration_start) : null;
  const regEndDate = event.registration_end ? parseISO(event.registration_end) : null;
  
  const formattedDate = formatEventDate(eventStartDate, eventEndDate, TIME_ZONE);
  const formattedTime = eventStartDate ? formatInTimeZone(eventStartDate, TIME_ZONE, 'hh:mm a zzz') : null;
  const formattedRegStart = regStartDate ? formatEventDate(regStartDate, null, TIME_ZONE) : 'Not specified';
  const formattedRegEnd = regEndDate ? formatEventDate(regEndDate, null, TIME_ZONE) : 'Not specified';
  
  const status = getEventStatus(event);
  const isCompleted = status.text === 'Completed';
  const isRegistrationAvailable = status.color === 'bg-green-500';
  
  const statusBadge = (
      <span 
          className={`text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5 ${status.color}`}
      >
          {status.icon}
          {status.text}
      </span>
  );
  
  const registrationContent = () => {
      if (authLoading || regCheckLoading) {
          return (
              <Card>
                  <CardContent className="py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-red" />
                      <p className="mt-4 text-gray-400">Checking your status...</p>
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

      const rejectionHistoryCard = rejectionHistory && registrationStatus !== 'rejected' && (
        <Card className="border-red-500 mb-6">
          <CardHeader>
            <CardTitle className="text-red-500">Previous Registration Rejected</CardTitle>
            <CardDescription>Your previous submission was not approved.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 font-medium">Reason:</p>
            <p className="text-gray-300 whitespace-pre-wrap">
              {rejectionHistory.rejection_reason || 'No reason provided.'}
            </p>
            <p className="text-gray-400 text-sm mt-3">
              You may submit a new registration below.
            </p>
          </CardContent>
        </Card>
      );
      
      if (isRegistered) {
          if (registrationStatus === 'approved') {
              return (
                  <Card className="border-green-500">
                      <CardHeader>
                          <CardTitle className="text-green-500">You are Registered!</CardTitle>
                          <CardDescription>Your registration for this event has been approved.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <p className="text-gray-300">We look forward to seeing you at the event. You will receive further details via email.</p>
                      </CardContent>
                  </Card>
              )
          }
          if (registrationStatus === 'pending') {
              return (
                  <>
                    {rejectionHistoryCard} 
                    <Card className="border-orange-500">
                        <CardHeader>
                            <CardTitle className="text-orange-500">Registration Pending</CardTitle>
                            <CardDescription>Your new submission is being reviewed by the admin.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-300">You will be notified by email once your registration is approved or rejected.</p>
                        </CardContent>
                    </Card>
                  </>
              )
          }
      }
      
      if (!isRegistrationAvailable) {
          if (registrationStatus === 'rejected' && rejectionHistory) {
             return (
                  <Card className="border-red-500">
                      <CardHeader>
                          <CardTitle className="text-red-500">Registration Rejected</CardTitle>
                          <CardDescription>Unfortunately, your registration was not approved.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <p className="text-gray-300 font-medium">Reason:</p>
                          <p className="text-gray-300 whitespace-pre-wrap">
                            {rejectionHistory.rejection_reason || 'No reason provided.'}
                          </p>
                          <p className="text-gray-500 text-sm mt-3">The registration period for this event is also closed.</p>
                      </CardContent>
                  </Card>
              )
          }
          return (
              <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                      <XCircle size={48} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-semibold mb-2">Registration Closed</p>
                      <p>The registration period for this event has ended or has not yet begun.</p>
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
                        <Button className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity">
                          Login or Register
                        </Button>
                      </Link>
                  </CardContent>
              </Card>
          )
      }
      
      if (submitted) {
          return (
              <Card className="border-orange-500">
                  <CardHeader>
                      <CardTitle className="text-orange-500">Registration Submitted</CardTitle>
                      <CardDescription>Your submission is now pending review.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <p className="text-gray-300">You will be notified by email once your registration is approved or rejected.</p>
                  </CardContent>
              </Card>
          )
      }

      const rejectedCard = registrationStatus === 'rejected' && rejectionHistory && (
         <Card className="border-red-500 mb-6">
            <CardHeader>
                <CardTitle className="text-red-500">Registration Rejected</CardTitle>
                <CardDescription>Unfortunately, your last registration was not approved. You may register again below.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-gray-300 font-medium">Message by the Event Organizer :</p>
                <p className="text-gray-300 whitespace-pre-wrap">
                  {rejectionHistory.rejection_reason || 'No reason provided.'}
                </p>
            </CardContent>
        </Card>
      );

      return (
          <>
            {rejectedCard} 
            {rejectionHistoryCard} 
            <Card>
                <CardHeader>
                    <CardTitle>Registration Form</CardTitle>
                    <CardDescription>Logged in as: {user?.email || 'Loading...'}</CardDescription>
                </CardHeader>
                <CardContent className="relative">
                    <DynamicForm
                        fields={event.form_fields || []}
                        onSubmit={handleSubmit}
                        eventId={params.id}
                        formData={formData} 
                        onFormChange={setAndStoreFormData}
                        // Pass fee info to DynamicForm button (optional, handled in page but you can visualize it there)
                        submitLabel={event.is_paid && event.registration_fee > 0 ? `Pay ₹${event.registration_fee} & Register` : 'Register Now'}
                    />
                </CardContent>
            </Card>
          </>
      )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Import Razorpay SDK Script */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      <div className="w-full h-64 bg-brand-gradient relative">
        {event?.banner_url && (
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

          {event && (
            <>
              <Card className="mb-8">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-3xl mb-2">{event.title}</CardTitle>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-2 text-brand-red" />
                          <span>{formattedDate}</span>
                        </div>
                        {formattedTime && (
                          <div className="flex items-center">
                            <Clock size={16} className="mr-2 text-brand-red" />
                            <span>{formattedTime}</span>
                          </div>
                        )}
                        {/* Show Fee Tag */}
                        {event.is_paid && (
                            <div className="flex items-center text-green-400 font-semibold">
                                <IndianRupee size={16} className="mr-1" />
                                <span>{event.registration_fee > 0 ? `INR ${event.registration_fee}` : 'Free'}</span>
                            </div>
                        )}
                      </div>
                    </div>
                    {statusBadge}
                  </div>
                </CardHeader>
                <CardContent>
                  <Card className="mb-6 bg-background">
                    <CardHeader>
                      <CardTitle className="text-lg">Registration Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium w-20">Starts:</span>
                        <span className="text-gray-300">{formattedRegStart}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium w-20">Ends:</span>
                        <span className="text-gray-300">{formattedRegEnd}</span>
                      </div>
                    </CardContent>
                  </Card>
                
                  <h3 className="font-bold text-xl mb-2">Description</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {event.description || 'No description available'}
                  </p>
                </CardContent>
              </Card>

              {registrationContent()}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// We wrap the default export in Suspense to allow useParams()
export default function EventDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
          <p className="mt-4 text-gray-400">Loading event...</p>
        </div>
      </div>
    }>
      <EventDetailContent />
    </Suspense>
  )
}