import { createClient, supabaseAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubmissionBuilderClient from './SubmissionBuilderClient'

export async function generateMetadata({ params }) {
  const supabase = supabaseAdmin || createClient()
  
  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', params.id)
    .single()

  return {
    title: event ? `Submission Form - ${event.title} | EventX` : 'Submission Form Builder | EventX',
    description: event ? `Design the project submission form for ${event.title}` : 'Build your hackathon submission form'
  }
}

export const revalidate = 0 // Always fresh data

export default async function SubmissionFormBuilderPage({ params }) {
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
    .select('id, title, submission_form_fields, event_type, created_by')
    .eq('id', params.id)
    .single()

  if (eventError || !event) {
    redirect('/admin/events')
  }

  // 4. Verify Permission and Event Type
  const canManage = isSuperAdmin || event.created_by === user.id
  if (!canManage) {
    redirect('/admin/events')
  }

  // Only hackathon events have submission forms
  if (event.event_type !== 'hackathon') {
    redirect(`/admin/events/${params.id}/dashboard`)
  }

  // 5. Render Client Component with SSR Data
  return <SubmissionBuilderClient initialEvent={event} />
}