import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { isWithinInterval } from 'date-fns'
import SubmitClient from './SubmitClient'

// Dynamic metadata for SEO
export async function generateMetadata({ params }) {
  const supabase = supabaseAdmin || createClient()
  
  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', params.id)
    .single()

  return {
    title: event ? `Submit Project - ${event.title} | EventX` : 'Submit Project | EventX',
    description: event ? `Submit your project for ${event.title}. Final hackathon submission portal.` : 'Hackathon project submission'
  }
}

export default async function ProjectSubmissionPage({ params }) {
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

  // 3. Fetch Participant Record
  const { data: participant, error: participantError } = await supabaseAdmin
    .from('participants')
    .select('id, status, selected_problem_id, submitted_at, submission_data')
    .eq('event_id', params.id)
    .eq('user_id', user.id)
    .single()

  // User not registered
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
          <p className="text-gray-400 mb-6">You are not registered for this event.</p>
          <a href={`/events/${params.id}/scope`} className="inline-flex items-center justify-center rounded-md bg-red-500/20 px-4 py-2 text-red-400 hover:bg-red-500/30 transition-colors">
            ← Back to Scope
          </a>
        </div>
      </div>
    )
  }

  // User not approved
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
          <p className="text-gray-400 mb-6">You must be an approved participant to submit.</p>
          <a href={`/events/${params.id}/scope`} className="inline-flex items-center justify-center rounded-md bg-yellow-500/20 px-4 py-2 text-yellow-400 hover:bg-yellow-500/30 transition-colors">
            ← Back to Scope
          </a>
        </div>
      </div>
    )
  }

  // 4. Check if Submission Window is Open
  const now = new Date()
  const submissionOpen = event?.submission_start && event?.submission_end
    ? isWithinInterval(now, {
        start: new Date(event.submission_start),
        end: new Date(event.submission_end)
      })
    : false

  // 5. Check if Already Submitted
  const hasSubmitted = !!participant.submitted_at

  // 6. Get Submission Form Fields
  const submissionFormFields = event.submission_form_fields || []

  // 7. Render Client Component with SSR Data
  return (
    <SubmitClient 
      initialEvent={event}
      submissionOpen={submissionOpen}
      hasSubmitted={hasSubmitted}
      submissionFormFields={submissionFormFields}
    />
  )
}