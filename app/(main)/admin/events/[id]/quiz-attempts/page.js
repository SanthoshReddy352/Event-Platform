import { createClient, supabaseAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuizAttemptsClient from './QuizAttemptsClient'

export async function generateMetadata({ params }) {
  const supabase = supabaseAdmin || createClient()
  
  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', params.id)
    .single()

  return {
    title: event ? `Quiz Submissions - ${event.title} | EventX` : 'Quiz Submissions | EventX',
    description: event ? `View quiz submissions and leaderboard for ${event.title}` : 'View quiz submissions'
  }
}

export const revalidate = 0 // Always fresh data

export default async function QuizAttemptsPage({ params }) {
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
    .select('*')
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

  // 5. Fetch Quiz Questions
  const { data: questions } = await supabaseAdmin
    .from('quiz_questions')
    .select('*')
    .eq('event_id', params.id)
    .order('order_index', { ascending: true })

  // 6. Fetch Quiz Attempts with User Emails
  const { data: attempts } = await supabaseAdmin
    .from('quiz_attempts')
    .select('*')
    .eq('event_id', params.id)
    .not('completed_at', 'is', null)
    .order('score', { ascending: false })

  // 7. Enrich attempts with user emails
  const attemptsWithEmails = await Promise.all(
    (attempts || []).map(async (attempt) => {
      const { data: { user: attemptUser } } = await supabaseAdmin.auth.admin.getUserById(attempt.user_id)
      return {
        ...attempt,
        email: attemptUser?.email || 'Unknown User'
      }
    })
  )

  // 8. Calculate Stats
  const totalScore = attemptsWithEmails.reduce((sum, a) => sum + (a.score || 0), 0)
  const stats = {
    total: attemptsWithEmails.length,
    averageScore: attemptsWithEmails.length > 0 ? totalScore / attemptsWithEmails.length : 0
  }

  // 9. Render Client Component with SSR Data
  return (
    <QuizAttemptsClient 
      event={event} 
      attempts={attemptsWithEmails}
      questions={questions || []}
      stats={stats}
    />
  )
}
