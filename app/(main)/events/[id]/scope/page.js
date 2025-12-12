import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { isBefore, isAfter } from 'date-fns'
import ScopeClient from './ScopeClient'

// Dynamic metadata for SEO
export async function generateMetadata({ params }) {
  const supabase = supabaseAdmin || createClient()
  
  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', params.id)
    .single()

  return {
    title: event ? `${event.title} - Hackathon Workspace | EventX` : 'Hackathon Workspace | EventX',
    description: event ? `Your command center for ${event.title}. Select problems, download templates, and submit your project.` : 'Hackathon participant workspace'
  }
}

export default async function HackathonScopePage({ params }) {
  const supabase = createClient()

  // 1. Verify User Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth')
  }

  // 2. Fetch Event Details
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', params.id)
    .single()

  if (eventError || !event) {
    notFound()
  }

  // 3. Validate Event Type - Must be hackathon
  if (event.event_type !== 'hackathon') {
    redirect(`/events/${params.id}`)
  }

  // 4. Time-based Access Control
  const currentTime = new Date()
  const eventStart = new Date(event.event_date)
  const eventEnd = new Date(event.event_end_date)

  // If event hasn't started, redirect with message
  if (isBefore(currentTime, eventStart)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 rounded-2xl text-center border border-red-500/30">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-500 mb-2">Event Not Started</h2>
          <p className="text-gray-400 mb-6">
            The event has not started yet. Please return at the scheduled start time.
          </p>
          <a href={`/events/${params.id}`} className="inline-flex items-center justify-center rounded-md bg-red-500/20 px-4 py-2 text-red-400 hover:bg-red-500/30 transition-colors">
            ← Back to Event
          </a>
        </div>
      </div>
    )
  }

  // If event has ended, show ended message
  if (isAfter(currentTime, eventEnd)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 rounded-2xl text-center border border-gray-700">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-400 mb-2">Event Concluded</h2>
          <p className="text-gray-500 mb-6">
            The event has concluded. This workspace is no longer accessible.
          </p>
          <a href={`/events/${params.id}`} className="inline-flex items-center justify-center rounded-md bg-gray-800 px-4 py-2 text-gray-400 hover:bg-gray-700 transition-colors">
            ← Back to Event
          </a>
        </div>
      </div>
    )
  }

  // 5. Fetch Participant Record
  const { data: participant, error: participantError } = await supabaseAdmin
    .from('participants')
    .select('id, status, selected_problem_id, submitted_at, submission_data')
    .eq('event_id', params.id)
    .eq('user_id', user.id)
    .single()

  // User not registered or not approved
  if (!participant) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 rounded-2xl text-center border border-red-500/30">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-6">
            You are not registered for this event.
          </p>
          <a href={`/events/${params.id}`} className="inline-flex items-center justify-center rounded-md bg-red-500/20 px-4 py-2 text-red-400 hover:bg-red-500/30 transition-colors">
            ← Back to Event
          </a>
        </div>
      </div>
    )
  }

  if (participant.status !== 'approved') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 rounded-2xl text-center border border-yellow-500/30">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-yellow-500 mb-2">Approval Pending</h2>
          <p className="text-gray-400 mb-6">
            You must be an approved participant to access the hackathon scope.
          </p>
          <a href={`/events/${params.id}`} className="inline-flex items-center justify-center rounded-md bg-yellow-500/20 px-4 py-2 text-yellow-400 hover:bg-yellow-500/30 transition-colors">
            ← Back to Event
          </a>
        </div>
      </div>
    )
  }

  // 6. Fetch Selected Problem Details (if any)
  let selectedProblem = null
  if (participant.selected_problem_id) {
    const { data: problemData } = await supabaseAdmin
      .from('problem_statements')
      .select('title, description')
      .eq('id', participant.selected_problem_id)
      .single()
    
    if (problemData) {
      selectedProblem = problemData
    }
  }

  // 7. Render Client Component with SSR Data
  return (
    <ScopeClient 
      initialEvent={event}
      initialParticipant={participant}
      initialSelectedProblem={selectedProblem}
      userId={user.id}
      userEmail={user.email}
    />
  )
}