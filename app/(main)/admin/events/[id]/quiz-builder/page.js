import { createClient, supabaseAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuizBuilderClient from './QuizBuilderClient'

export async function generateMetadata({ params }) {
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('title')
    .eq('id', params.id)
    .single()

  return {
    title: event ? `Quiz Builder - ${event.title} | EventX` : 'Quiz Builder | EventX',
    description: event ? `Create and manage quiz questions for ${event.title}` : 'Build your event quiz'
  }
}

export const revalidate = 0 // Always fresh data

export default async function QuizBuilderPage({ params }) {
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
    .select('id, title, created_by')
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

  // 5. Fetch Quiz Questions (server-side)
  const { data: questions, error: questionsError } = await supabaseAdmin
    .from('quiz_questions')
    .select('*')
    .eq('event_id', params.id)
    .order('created_at', { ascending: true })

  if (questionsError) {
    console.error('Error fetching questions:', questionsError)
  }

  // 6. Render Client Component with SSR Data
  return (
    <QuizBuilderClient 
      initialEvent={event} 
      initialQuestions={questions || []} 
    />
  )
}
