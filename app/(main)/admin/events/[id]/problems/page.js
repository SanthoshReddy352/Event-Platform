import { createClient, supabaseAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProblemsClient from './ProblemsClient'

export async function generateMetadata({ params }) {
  const supabase = supabaseAdmin || createClient()
  
  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', params.id)
    .single()

  return {
    title: event ? `Problem Statements - ${event.title} | EventX` : 'Problem Statements | EventX',
    description: event ? `Manage problem statements for ${event.title}` : 'Manage hackathon problem statements'
  }
}

export const revalidate = 0 // Always fresh data

export default async function ProblemStatementsPage({ params }) {
  const supabase = createClient()

  // 1. Verify User Authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth')
  }

  // 2. Check Admin Status
  const { data: adminData } = await supabaseAdmin
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const isSuperAdmin = adminData?.role === 'super_admin'

  // 3. Fetch Event Data
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, title, event_type, created_by')
    .eq('id', params.id)
    .single()

  if (eventError || !event) {
    redirect('/admin/events')
  }

  // 4. Verify Permission
  const canManage = isSuperAdmin || event.created_by === user.id
  if (!canManage) {
    redirect('/admin/events')
  }

  // 5. Fetch Problem Statements
  const { data: problems, error: problemsError } = await supabaseAdmin
    .from('problem_statements')
    .select('*')
    .eq('event_id', params.id)
    .order('created_at', { ascending: true })

  if (problemsError) {
    console.error('Error fetching problems:', problemsError)
  }

  // 6. Render Client Component with SSR Data
  return (
    <ProblemsClient 
      initialEvent={event} 
      initialProblems={problems || []} 
    />
  )
}