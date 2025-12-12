'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useRouter } from 'next/navigation'
import DynamicForm from '@/components/DynamicForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card' 
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ArrowLeft, Loader2, FileClock, XCircle, CheckCircle, IndianRupee, Tag, Target, ArrowRight } from 'lucide-react'
import { parseISO, format } from 'date-fns'; 
import { formatInTimeZone } from 'date-fns-tz'; 
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client' 
import { useAuth } from '@/context/AuthContext' 
import Script from 'next/script'
import { fetchWithTimeout } from '@/lib/utils'

// Helper function to format date ranges
const formatEventDate = (start, end, timeZone) => {
  if (!start) return 'Date TBA';
  
  // Handle timezone abbreviation: 'Asia/Kolkata' is commonly displayed as 'IST'
  // but date-fns might output 'GMT+5:30' depending on locale/context. 
  // [FIX] Enforce IST to match server-side rendering
  const tz = timeZone === 'Asia/Kolkata' ? 'IST' : formatInTimeZone(start, timeZone, 'zzz');
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
  const eventStartDate = event.event_date ? parseISO(event.event_date) : null;

  if (eventEndDate && now > eventEndDate) {
    return { text: 'Completed', color: 'bg-gray-500', icon: <CheckCircle size={16} /> };
  }
  
  if (!event.is_active) {
    return { text: 'Inactive', color: 'bg-gray-400' };
  }

  // Check if event is currently ongoing
  if (eventStartDate && eventEndDate && now >= eventStartDate && now <= eventEndDate) {
      return { text: 'Ongoing', color: 'bg-blue-600', icon: <Clock size={16} /> };
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

export default function EventClient({ initialEvent }) {
  const params = useParams()
  const router = useRouter()
  
  const { user, session, loading: authLoading } = useAuth() 
  
  const EVENT_STORAGE_KEY = `event_page_data_${params.id}`;
  const formStorageKey = `formData-${params.id}`;

  // Initialize state with props
  const [loading, setLoading] = useState(false); // Event is already loaded via props
  const [event, setEvent] = useState(initialEvent);
  const [submitted, setSubmitted] = useState(false);
  const [quizStatus, setQuizStatus] = useState(null); // 'in_progress', 'completed', or null
  
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [rejectionHistory, setRejectionHistory] = useState(null);

  const [formData, setFormData] = useState({});
  const [selectedImage, setSelectedImage] = useState(null)

  // Load cached form data on mount
  useEffect(() => {
    try {
        const savedForm = window.sessionStorage.getItem(formStorageKey);
        if (savedForm) {
            setFormData(JSON.parse(savedForm));
        }
        
        // Also check cached registration status if available?
        // We will fetch fresh participant data anyway.
    } catch (e) {
        console.error("Error reading cache:", e);
    }
  }, [formStorageKey]);

  const setAndStoreFormData = (newData) => {
    setFormData(newData);
    window.sessionStorage.setItem(formStorageKey, JSON.stringify(newData));
  };

  // Fetch Participant and Quiz Data (Client Side)
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function loadUserData() {
        if (authLoading) return;
        
        // If we don't have an event for some reason (shouldn't happen if passed from server, but safe check)
        if (!event) return;

        try {
            const safeFetch = (promise) => promise.catch(err => {
                if (err.name === 'AbortError') return { aborted: true };
                throw err;
            });
            
            let fetchParticipantPromise = Promise.resolve(null);
            let fetchQuizAttemptPromise = Promise.resolve(null);
            
            if (user?.id) {
                if (session?.access_token) {
                    fetchParticipantPromise = safeFetch(
                        fetch(`/api/participants/${params.id}?userId=${user.id}`, {
                            headers: { 'Authorization': `Bearer ${session.access_token}` },
                            signal: controller.signal,
                            cache: 'no-store'
                        }).then(res => {
                             if (res.status === 403) return { success: false, error: "Forbidden" };
                             return res.json();
                        })
                    );

                    fetchQuizAttemptPromise = supabase
                        .from('quiz_attempts')
                        .select('status')
                        .eq('event_id', params.id)
                        .eq('user_id', user.id)
                        .maybeSingle();
                }
            }

            const [participantResult, quizAttemptResult] = await Promise.all([fetchParticipantPromise, fetchQuizAttemptPromise]);

            if (!mounted) return;
            if (participantResult?.aborted) return;

            let newIsRegistered = false;
            let newRegistrationStatus = null;
            let newRejectionHistory = null;

            if (participantResult && participantResult.success && participantResult.participants && participantResult.participants.length > 0) {
                const mostRecent = participantResult.participants[participantResult.participants.length - 1];
                newIsRegistered = true;
                newRegistrationStatus = mostRecent.status;
                
                const rejected = participantResult.participants
                    .filter(p => p.status === 'rejected')
                    .pop();
                newRejectionHistory = rejected || null;

                setIsRegistered(newIsRegistered);
                setRegistrationStatus(newRegistrationStatus);
                setRejectionHistory(newRejectionHistory);
            } else {
                setIsRegistered(false);
                setRegistrationStatus(null);
                setRejectionHistory(null);
            }

            if (quizAttemptResult && quizAttemptResult.data) {
                setQuizStatus(quizAttemptResult.data.status);
            } else {
                setQuizStatus(null);
            }

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Error loading user data:", error);
            }
        }
    }

    loadUserData();

    return () => { 
        mounted = false; 
        controller.abort();
    };
  }, [params.id, authLoading, user?.id, event, session]);

  const checkRegistrationStatus = useCallback(async (userId, eventId, currentSession) => {
      try {
        if (!currentSession) return;
  
        const response = await fetch(`/api/participants/${eventId}?userId=${userId}`, {
          headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
        });
        const data = await response.json();
        
        if (data.success && data.participants && data.participants.length > 0) {
          const mostRecent = data.participants[data.participants.length - 1];
          setIsRegistered(true);
          setRegistrationStatus(mostRecent.status);
        } 
      } catch (error) {
        console.error("Error re-checking registration:", error);
      }
    }, []);

  const handleSubmit = useCallback(async (submitData) => {
    console.log("[EventClient] handleSubmit triggered", submitData);
    if (!user) {
        alert('You must be logged in to register.');
        return;
    }

    if (event.is_paid && event.registration_fee > 0) {
        console.log("[EventClient] Starting payment flow");
        try {
            if (!window.Razorpay) {
                alert("Razorpay SDK failed to load. Please check your internet connection or ad-blocker.");
                return;
            }

            const res = await fetch("/api/razorpay/create-order", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: event.registration_fee, eventId: event.id }),
            });
            
            const order = await res.json();
            
            if (!res.ok) {
                throw new Error(order.error || `Server Error: ${res.status}`);
            }

            if (!order.id) {
                throw new Error("Invalid response received from payment server");
            }

            const options = {
                key: order.key_id, 
                amount: order.amount,
                currency: order.currency,
                name: "Event Platform", 
                description: `Registration for ${event.title}`,
                order_id: order.id,
                handler: async function (response) {
                    try {
                        console.log("[EventClient] Payment success, verifying...");
                        const verifyRes = await fetch("/api/razorpay/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                                eventId: event.id,
                                userId: user.id,
                                userDetails: { email: user.email }, 
                                responses: submitData 
                            }),
                        });

                        const result = await verifyRes.json();
                        if (result.success) {
                            setSubmitted(true);
                            window.sessionStorage.removeItem(formStorageKey);
                            alert("Payment Successful! You are registered.");
                            checkRegistrationStatus(user.id, event.id, session);
                        } else {
                            alert("Payment verification failed: " + (result.error || "Please contact support"));
                        }
                    } catch (err) {
                        console.error("Verification error", err);
                        alert("Error during verification: " + err.message);
                    }
                },
                prefill: {
                    name: user.user_metadata?.full_name || "",
                    email: user.email,
                },
                theme: {
                    color: "#E11D48", 
                },
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response){
                    console.error("Payment failed", response.error);
                    alert("Payment Failed: " + response.error.description);
            });
            rzp1.open();

        } catch (error) {
            console.error("Payment initiation error:", error);
            alert(`Could not start payment: ${error.message}`);
        }
        return; 
    }
    
    
    try {
        console.log("[EventClient] Starting free registration flow");
        
        // [FIX] Use cached session from AuthContext instead of fetching again
        const currentSession = session; 
        
        console.log("[EventClient] Session check:", !!currentSession);
        
        if (!currentSession) {
            throw new Error("No active session. Please log in again.");
        }
      
        console.log("[EventClient] Sending request to /api/participants");
        const response = await fetchWithTimeout('/api/participants', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentSession.access_token}`
            },
            body: JSON.stringify({
                event_id: params.id,
                user_id: user.id,
                responses: submitData
            }),
            timeout: 20000 
        });
        
        console.log("[EventClient] Response received", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[EventClient] Server error:", errorText);
            throw new Error(`Server returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log("[EventClient] Parsed response data", data);

        if (data.success) {
            setSubmitted(true);
            window.sessionStorage.removeItem(formStorageKey); 
        } else {
            alert(`Registration failed: ${data.error}`);
        }
    } catch (error) {
        console.error('Registration error:', error);
        if (error.name === 'AbortError') {
             alert("Registration timed out. Please check your connection and try again.");
        } else {
             alert(`An error occurred: ${error.message}`);
        }
    }
  }, [user, event, params.id, formStorageKey, checkRegistrationStatus]);

  if (loading && !event) {
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
  const formattedTime = eventStartDate ? (
    TIME_ZONE === 'Asia/Kolkata' 
      ? `${formatInTimeZone(eventStartDate, TIME_ZONE, 'hh:mm a')} IST`
      : formatInTimeZone(eventStartDate, TIME_ZONE, 'hh:mm a zzz')
  ) : null;
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
      if (isCompleted) {
           if (event.gallery_images && event.gallery_images.length > 0) {
               return (
                   <div className="space-y-6">
                       <Card>
                          <CardHeader>
                              <CardTitle>Event Gallery</CardTitle>
                              <CardDescription>Highlights from the event</CardDescription>
                          </CardHeader>
                          <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {event.gallery_images.map((url, index) => (
                                      <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border cursor-pointer" onClick={() => setSelectedImage(url)}>
                                          <img 
                                              src={url} 
                                              alt={`Event Gallery ${index + 1}`} 
                                              className="w-full h-full object-cover transition-transform hover:scale-105"
                                              loading="lazy"
                                              referrerPolicy="no-referrer"
                                          />
                                      </div>
                                  ))}
                              </div>
                          </CardContent>
                       </Card>

                       {selectedImage && typeof document !== 'undefined' && createPortal(
                           <div 
                               className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
                               onClick={() => setSelectedImage(null)}
                           >
                               <button 
                                   onClick={() => setSelectedImage(null)} 
                                   className="fixed top-4 right-4 text-white hover:text-red-500 transition-colors z-[10000] p-2 bg-black/50 rounded-full hover:bg-black/70"
                                   aria-label="Close Preview"
                               >
                                   <XCircle size={40} />
                               </button>

                               <div className="relative w-full max-w-7xl max-h-[90vh] flex items-center justify-center">
                                   <img 
                                       src={selectedImage} 
                                       alt="Gallery Fullscreen" 
                                       className="w-auto h-auto max-w-full max-h-[90vh] object-contain rounded-md shadow-2xlSelect"
                                       referrerPolicy="no-referrer"
                                       onClick={(e) => e.stopPropagation()} 
                                   />
                               </div>
                           </div>,
                           document.body
                       )}
                       
                       <Card>
                           <CardContent className="py-6 text-center text-gray-500">
                               <CheckCircle size={24} className="mx-auto mb-2 text-gray-400" />
                               <p className="font-medium">Event Completed</p>
                           </CardContent>
                       </Card>
                   </div>
               )
           }

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
              const isHackathon = event.event_type === 'hackathon';
              const now = new Date();
              const scopeStartTime = event.problem_selection_start 
                  ? parseISO(event.problem_selection_start) 
                  : (event.event_date ? parseISO(event.event_date) : null);
              
              const isScopeOpen = scopeStartTime && now >= scopeStartTime;

              return (
                  <Card className="border-green-500">
                      <CardHeader>
                          <CardTitle className="text-green-500">You are Registered!</CardTitle>
                          <CardDescription>Your registration for this event has been approved.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <p className="text-gray-300">We look forward to seeing you at the event. You will receive further details via email.</p>
                          
                          {isHackathon && (
                            <div className="mt-6 pt-4 border-t border-border">
                                {isScopeOpen ? (
                                    <Link href={`/events/${params.id}/scope`}>
                                        <Button className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90 shadow-md">
                                            <Target className="mr-2 h-4 w-4" />
                                            Enter Hackathon Workspace
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                ) : (
                                    <div className="text-center">
                                        <Button disabled className="w-full bg-gray-700 text-gray-400 cursor-not-allowed">
                                            <Clock className="mr-2 h-4 w-4" />
                                            Workspace opens {scopeStartTime ? formatInTimeZone(scopeStartTime, TIME_ZONE, 'MMM dd, hh:mm a') : 'soon'}
                                        </Button>
                                        <p className="text-xs text-gray-500 mt-2">
                                            The hackathon workspace will become available at the scheduled start time.
                                        </p>
                                    </div>
                                )}
                            </div>
                          )}

                          {event.event_type === 'mcq' && (
                            <div className="mt-6 pt-4 border-t border-border">
                                {(() => {
                                    const quizStartTime = event.submission_start ? parseISO(event.submission_start) : null;
                                    const quizEndTime = event.submission_end ? parseISO(event.submission_end) : null;
                                    const now = new Date();
                                    const isQuizOpen = (!quizStartTime || now >= quizStartTime) && (!quizEndTime || now <= quizEndTime);
                                    
                                    if (quizStatus === 'completed') {
                                        return (
                                            <div className="text-center">
                                                <Button disabled className="w-full bg-green-600/20 text-green-500 border border-green-600/50 cursor-not-allowed">
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Quiz Submitted
                                                </Button>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    You have already submitted this quiz.
                                                </p>
                                            </div>
                                        );
                                    }

                                    if (isQuizOpen) {
                                        return (
                                            <Link href={`/events/${params.id}/quiz`}>
                                                <Button className="w-full bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-md">
                                                    <FileClock className="mr-2 h-4 w-4" />
                                                    {quizStatus === 'in_progress' ? 'Resume Quiz' : 'Start Quiz'}
                                                    <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            </Link>
                                        );
                                    } else {
                                        return (
                                            <div className="text-center">
                                                <Button disabled className="w-full bg-gray-700 text-gray-400 cursor-not-allowed">
                                                    <Clock className="mr-2 h-4 w-4" />
                                                    Quiz {now < quizStartTime ? `starts ${formatInTimeZone(quizStartTime, TIME_ZONE, 'MMM dd, hh:mm a')}` : 'has ended'}
                                                </Button>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    The quiz is only available during the scheduled window.
                                                </p>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                          )}
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
                        submitLabel={event.is_paid && event.registration_fee > 0 ? `Pay ₹${event.registration_fee} & Register` : 'Register Now'}
                    />
                </CardContent>
            </Card>
          </>
      )
  }

  return (
    <div className="min-h-screen bg-background">
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
                          <Tag size={16} className="mr-2 text-brand-red" />
                          <span className="capitalize">{event.event_type === 'mcq' ? 'Quiz' : (event.event_type?.replace('_', ' ') || 'Event')}</span>
                        </div>
                        
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
