import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { isWithinInterval } from 'date-fns'
import ProblemsSelectionClient from './ProblemsSelectionClient'

// Dynamic metadata for SEO
export async function generateMetadata({ params }) {
  const supabase = supabaseAdmin || createClient()
  
  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', params.id)
    .single()

  return {
    title: event ? `Problem Statements - ${event.title} | EventX` : 'Problem Statements | EventX',
    description: event ? `Choose your challenge for ${event.title}. Select a problem statement to solve.` : 'Select your hackathon problem statement'
  }
}

export default async function ProblemSelectionPage({ params }) {
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
    .select('id, status, selected_problem_id')
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
          <a href={`/events/${params.id}`} className="inline-flex items-center justify-center rounded-md bg-red-500/20 px-4 py-2 text-red-400 hover:bg-red-500/30 transition-colors">
            ← Back to Event
          </a>
        </div>
      </div>
    )
  }

  // 4. Fetch All Problems with Selection Counts
  const { data: problems, error: problemsError } = await supabaseAdmin
    .from('problem_statements')
    .select('*')
    .eq('event_id', params.id)
    .order('created_at', { ascending: true })

  if (problemsError) {
    console.error('Error fetching problems:', problemsError)
  }

  // 5. Calculate Selection Counts
  const { data: allParticipants } = await supabaseAdmin
    .from('participants')
    .select('selected_problem_id')
    .eq('event_id', params.id)
    .not('selected_problem_id', 'is', null)

  const selectionCounts = {}
  if (allParticipants) {
    allParticipants.forEach(p => {
      selectionCounts[p.selected_problem_id] = (selectionCounts[p.selected_problem_id] || 0) + 1
    })
  }

  // 6. Enrich Problems with Selection Data
  const problemsWithCounts = (problems || []).map(p => ({
    ...p,
    current_selections: selectionCounts[p.id] || 0,
    is_full: (selectionCounts[p.id] || 0) >= p.max_selections
  }))

  // 7. Check if Selection Window is Open
  const now = new Date()
  const selectionOpen = event?.problem_selection_start && event?.problem_selection_end
    ? isWithinInterval(now, {
        start: new Date(event.problem_selection_start),
        end: new Date(event.problem_selection_end)
      })
    : false

  // 8. Render Client Component with SSR Data
  return (
    <ProblemsSelectionClient 
      initialEvent={event}
      initialProblems={problemsWithCounts}
      initialParticipant={participant}
      selectionOpen={selectionOpen}
    />
  )
}