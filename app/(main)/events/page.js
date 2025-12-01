'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, ArrowLeft, Loader2, CheckCircle, XCircle, AlertCircle, FileDown, Trophy, Upload } from 'lucide-react'
import { parseISO, format, isWithinInterval, isBefore, isAfter } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import DynamicForm from '@/components/DynamicForm'
import { toast } from 'sonner' // Assuming you have sonner installed

// --- 1. Helper Functions ---

const TIME_ZONE = 'Asia/Kolkata';

const formatEventDate = (start, end) => {
  if (!start) return 'Date TBA';
  const tz = formatInTimeZone(start, TIME_ZONE, 'zzz');
  const startDate = formatInTimeZone(start, TIME_ZONE, 'MMM dd');
  const startTime = formatInTimeZone(start, TIME_ZONE, 'hh:mm a');
  if (!end) return `${startDate} at ${startTime} ${tz}`;
  const endDate = formatInTimeZone(end, TIME_ZONE, 'MMM dd');
  const endTime = formatInTimeZone(end, TIME_ZONE, 'hh:mm a');
  if (startDate === endDate) return `${startDate} · ${startTime} - ${endTime} ${tz}`;
  return `${startDate} ${startTime} - ${endDate} ${endTime} ${tz}`;
}

const getEventStatus = (event) => {
  const now = new Date();
  const end = event.event_end_date ? parseISO(event.event_end_date) : null;
  const regStart = event.registration_start ? parseISO(event.registration_start) : null;
  const regEnd = event.registration_end ? parseISO(event.registration_end) : null;

  if (end && now > end) return { text: 'Completed', color: 'bg-gray-500', icon: <CheckCircle size={14} /> };
  if (!event.is_active) return { text: 'Inactive', color: 'bg-gray-400' };
  
  // Registration Status
  if (regStart && now < regStart) return { text: `Reg Opens ${format(regStart, 'MMM dd')}`, color: 'bg-blue-500' };
  if ((regEnd && now > regEnd) || !event.registration_open) return { text: 'Reg Closed', color: 'bg-red-500', icon: <XCircle size={14} /> };
  
  return { text: 'Registration Open', color: 'bg-green-500', icon: <CheckCircle size={14} /> };
}

// --- 2. Main Content Component ---

function EventDetailContent() {
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  
  // Data State
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Registration State
  const [isRegistered, setIsRegistered] = useState(false)
  const [registrationStatus, setRegistrationStatus] = useState(null)
  const [participantData, setParticipantData] = useState(null)
  const [rejectionHistory, setRejectionHistory] = useState(null)
  
  // Hackathon State
  const [problems, setProblems] = useState([])
  const [selectedProblem, setSelectedProblem] = useState(null)
  const [selectingProblemId, setSelectingProblemId] = useState(null) // Loading state for button

  // Form State
  const [regFormData, setRegFormData] = useState({})
  const [subFormData, setSubFormData] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // --- 3. Data Fetching ---

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // A. Fetch Event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.id)
        .single()
      
      if (eventError) throw eventError
      setEvent(eventData)

      // B. Fetch Registration Status (if logged in)
      if (user) {
        const { data: partData, error: partError } = await supabase
          .from('participants')
          .select('*')
          .eq('event_id', params.id)
          .eq('user_id', user.id)
        
        if (partData && partData.length > 0) {
           // Get latest
           const latest = partData[partData.length - 1];
           setIsRegistered(true)
           setRegistrationStatus(latest.status)
           setParticipantData(latest)

           // Check for history
           const rejected = partData.find(p => p.status === 'rejected');
           if (rejected && latest.status !== 'rejected') setRejectionHistory(rejected);
           
           // If Approved Hackathon -> Set Selected Problem
           if (latest.status === 'approved' && eventData.event_type === 'hackathon' && latest.selected_problem_id) {
             // We need to fetch the problem details
             const { data: prob } = await supabase.from('problem_statements').select('*').eq('id', latest.selected_problem_id).single()
             setSelectedProblem(prob)
           }
        }
      }

      // C. Fetch Problem Statements (If Hackathon)
      if (eventData.event_type === 'hackathon') {
        const { data: probList } = await supabase
            .from('problem_statements')
            .select('*')
            .eq('event_id', params.id)
            .order('created_at', { ascending: true })
        setProblems(probList || [])
      }

    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [params.id, user])

  useEffect(() => {
    if (!authLoading) fetchData()
  }, [fetchData, authLoading])


  // --- 4. Actions ---

  const handleRegister = async (formData) => {
    if (!user) return
    try {
        setIsSubmitting(true)
        const response = await fetch('/api/participants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: params.id,
                user_id: user.id,
                responses: formData
            }),
        });
        const data = await response.json();
        if (data.success) {
            toast.success("Registration submitted!")
            fetchData() // Refresh state
        } else {
            toast.error(data.error || "Registration failed")
        }
    } catch (e) {
        toast.error("An error occurred")
    } finally {
        setIsSubmitting(false)
    }
  }

  const handleSelectProblem = async (problemId) => {
     if (!user || !participantData) return;
     try {
        setSelectingProblemId(problemId)
        
        // Call RPC function
        const { data, error } = await supabase.rpc('check_and_select_problem', {
            p_user_id: user.id,
            p_event_id: params.id,
            p_problem_id: problemId
        })

        if (error) throw error;
        
        toast.success("Problem selected successfully!")
        fetchData() // Refresh to update UI

     } catch (err) {
        console.error(err)
        toast.error(err.message || "Failed to select problem. It might be full.")
     } finally {
        setSelectingProblemId(null)
     }
  }

  const handleFinalSubmission = async (formData) => {
      // Logic to update participant record with submission_data
      // We can reuse the /api/participants update logic or create a new endpoint
      // For now, let's assume we update the 'participants' table directly via Supabase client for simplicity
      // In production, use an API route for security/validation.
      
      try {
          setIsSubmitting(true)
          const { error } = await supabase
            .from('participants')
            .update({
                submission_data: formData,
                submitted_at: new Date().toISOString()
            })
            .eq('id', participantData.id)
          
          if (error) throw error
          toast.success("Project submitted successfully!")
          fetchData()
      } catch (err) {
          toast.error("Submission failed")
      } finally {
          setIsSubmitting(false)
      }
  }


  // --- 5. Render Logic ---

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-red" /></div>
  if (!event) return <div className="p-10 text-center">Event not found</div>

  const status = getEventStatus(event)
  const isHackathon = event.event_type === 'hackathon';
  const isApproved = registrationStatus === 'approved';
  const now = new Date();

  // --- HACKATHON DASHBOARD COMPONENTS ---
  
  const renderHackathonDashboard = () => {
    // 1. Timings Check
    const selStart = event.problem_selection_start ? parseISO(event.problem_selection_start) : null;
    const selEnd = event.problem_selection_end ? parseISO(event.problem_selection_end) : null;
    const pptTime = event.ppt_release_time ? parseISO(event.ppt_release_time) : null;
    const subStart = event.submission_start ? parseISO(event.submission_start) : null;
    const subEnd = event.submission_end ? parseISO(event.submission_end) : null;

    const isSelOpen = selStart && selEnd && isWithinInterval(now, { start: selStart, end: selEnd });
    const isPptReleased = pptTime && isAfter(now, pptTime);
    const isSubOpen = subStart && subEnd && isWithinInterval(now, { start: subStart, end: subEnd });
    const isSubOver = subEnd && isAfter(now, subEnd);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-brand-gradient p-6 rounded-xl text-white shadow-lg">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Trophy className="h-6 w-6" />
                    Participant Dashboard
                </h2>
                <p className="opacity-90">Welcome to the Hackathon zone! Follow the stages below.</p>
            </div>

            {/* STAGE 1: PROBLEM SELECTION */}
            <Card className={`border-l-4 ${isSelOpen ? 'border-l-green-500 shadow-md' : 'border-l-gray-300 opacity-80'}`}>
                <CardHeader>
                    <CardTitle className="flex justify-between">
                        <span>1. Problem Statement Selection</span>
                        {selectedProblem && <Badge className="bg-green-500">Completed</Badge>}
                    </CardTitle>
                    <CardDescription>
                        {isSelOpen ? "Select your problem statement now!" : 
                         (selStart && isBefore(now, selStart)) ? `Opens on ${format(selStart, 'MMM dd, hh:mm a')}` : 
                         "Selection Closed"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {selectedProblem ? (
                        <div className="bg-green-50 p-4 rounded border border-green-200">
                            <h4 className="font-bold text-green-800">You selected: {selectedProblem.title}</h4>
                            <p className="text-green-700 text-sm mt-1">{selectedProblem.description}</p>
                        </div>
                    ) : (
                        isSelOpen ? (
                            <div className="grid gap-4">
                                {problems.map(prob => (
                                    <div key={prob.id} className="border p-4 rounded flex justify-between items-center hover:bg-gray-50">
                                        <div>
                                            <h4 className="font-semibold">{prob.title}</h4>
                                            <p className="text-sm text-gray-500 line-clamp-2">{prob.description}</p>
                                        </div>
                                        <Button 
                                            onClick={() => handleSelectProblem(prob.id)}
                                            disabled={selectingProblemId === prob.id}
                                        >
                                            {selectingProblemId === prob.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Select
                                        </Button>
                                    </div>
                                ))}
                                {problems.length === 0 && <p className="text-gray-500 italic">No problems added yet.</p>}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">Problem statements are hidden.</p>
                        )
                    )}
                </CardContent>
            </Card>

            {/* STAGE 2: PPT TEMPLATE */}
            <Card className={`border-l-4 ${isPptReleased ? 'border-l-blue-500' : 'border-l-gray-300'}`}>
                <CardHeader>
                    <CardTitle>2. Presentation Round</CardTitle>
                    <CardDescription>Download the template for your pitch.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isPptReleased ? (
                        event.ppt_template_url ? (
                            <Link href={event.ppt_template_url} target="_blank">
                                <Button variant="outline" className="gap-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
                                    <FileDown className="h-4 w-4" />
                                    Download PPT Template
                                </Button>
                            </Link>
                        ) : (
                            <p className="text-gray-500 italic">No template provided by admin.</p>
                        )
                    ) : (
                        <div className="flex items-center gap-2 text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>Available at: {pptTime ? format(pptTime, 'MMM dd, hh:mm a') : 'TBA'}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* STAGE 3: SUBMISSION */}
            <Card className={`border-l-4 ${isSubOpen ? 'border-l-orange-500 shadow-md' : 'border-l-gray-300'}`}>
                <CardHeader>
                    <CardTitle className="flex justify-between">
                        <span>3. Final Submission</span>
                        {participantData?.submitted_at && <Badge className="bg-green-500">Submitted</Badge>}
                    </CardTitle>
                    <CardDescription>
                         {isSubOpen ? "Submit your project details." : 
                          isSubOver ? "Submission Deadline Passed" :
                          `Opens on ${subStart ? format(subStart, 'MMM dd, hh:mm a') : 'TBA'}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {participantData?.submitted_at ? (
                        <div className="bg-green-50 p-4 rounded text-center">
                            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                            <p className="font-medium text-green-800">Project Submitted Successfully!</p>
                            <p className="text-xs text-green-600">At: {format(new Date(participantData.submitted_at), 'PPP p')}</p>
                        </div>
                    ) : isSubOpen ? (
                        <DynamicForm 
                            fields={event.submission_form_fields || []}
                            onSubmit={handleFinalSubmission}
                            isSubmitting={isSubmitting}
                            submitLabel="Submit Final Project"
                        />
                    ) : (
                        <p className="text-sm text-gray-500">Form not available.</p>
                    )}
                </CardContent>
            </Card>

        </div>
    )
  }

  // --- RENDER ---

  return (
    <div className="min-h-screen bg-background pb-12">
        {/* Banner */}
        <div className="w-full h-64 bg-gray-900 relative">
            {event.banner_url && <img src={event.banner_url} className="w-full h-full object-cover opacity-60" />}
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
            <div className="absolute bottom-4 left-0 container px-4">
                <Badge className={`mb-2 ${status.color}`}>{status.text}</Badge>
                <h1 className="text-4xl font-bold text-white mb-2">{event.title}</h1>
                <div className="flex text-white/80 gap-4 text-sm">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {formatEventDate(parseISO(event.event_date), event.event_end_date ? parseISO(event.event_end_date) : null)}</span>
                </div>
            </div>
        </div>

        <div className="container mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Details */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader><CardTitle>About Event</CardTitle></CardHeader>
                    <CardContent className="whitespace-pre-wrap text-gray-600">{event.description}</CardContent>
                </Card>

                {/* CONDITION: If Hackathon AND Approved -> Show Dashboard. Else -> Show Registration Status/Form */}
                {isHackathon && isApproved ? (
                    renderHackathonDashboard()
                ) : (
                   // Standard Registration View
                   <Card>
                       <CardHeader>
                           <CardTitle>Registration</CardTitle>
                           <CardDescription>
                               {registrationStatus === 'pending' && "Your application is under review."}
                               {registrationStatus === 'rejected' && "Your application was not approved."}
                               {!isRegistered && "Fill out the form below to register."}
                           </CardDescription>
                       </CardHeader>
                       <CardContent>
                           {/* Rejection History Alert */}
                           {rejectionHistory && (
                               <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4 text-sm">
                                   <strong>Previous Application Rejected:</strong> {rejectionHistory.rejection_reason}
                               </div>
                           )}

                           {isRegistered ? (
                               <div className={`p-4 rounded border text-center ${registrationStatus === 'approved' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                                   <p className="font-semibold capitalize text-lg">{registrationStatus}</p>
                                   <p className="text-sm opacity-80">
                                       {registrationStatus === 'approved' ? 'You are all set!' : 'Please wait for admin approval.'}
                                   </p>
                               </div>
                           ) : (
                               status.text === 'Registration Open' ? (
                                   <DynamicForm 
                                        fields={event.form_fields} 
                                        onSubmit={handleRegister}
                                        isSubmitting={isSubmitting}
                                   />
                               ) : (
                                   <div className="text-center py-8 text-gray-500">
                                       Registration is currently closed.
                                   </div>
                               )
                           )}
                       </CardContent>
                   </Card>
                )}
            </div>

            {/* Right Col: Sidebar info */}
            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle className="text-lg">Event Schedule</CardTitle></CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        {isHackathon && (
                            <>
                                <div>
                                    <span className="font-semibold block text-gray-700">Problem Selection</span>
                                    <span className="text-gray-500">
                                        {event.problem_selection_start ? format(parseISO(event.problem_selection_start), 'MMM dd, HH:mm') : 'TBA'}
                                    </span>
                                </div>
                                <Separator />
                                <div>
                                    <span className="font-semibold block text-gray-700">PPT Release</span>
                                    <span className="text-gray-500">
                                        {event.ppt_release_time ? format(parseISO(event.ppt_release_time), 'MMM dd, HH:mm') : 'TBA'}
                                    </span>
                                </div>
                                <Separator />
                                <div>
                                    <span className="font-semibold block text-gray-700">Submission Deadline</span>
                                    <span className="text-gray-500">
                                        {event.submission_end ? format(parseISO(event.submission_end), 'MMM dd, HH:mm') : 'TBA'}
                                    </span>
                                </div>
                            </>
                        )}
                        {!isHackathon && <p className="text-gray-500">Standard event schedule.</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  )
}

export default function EventPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading...</div>}>
            <EventDetailContent />
        </Suspense>
    )
}