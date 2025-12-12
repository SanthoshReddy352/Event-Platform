import { createClient, supabaseAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ParticipantsClient from './ParticipantsClient'

export async function generateMetadata({ params }) {
  const supabase = supabaseAdmin || createClient()
  
  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', params.eventId)
    .single()

  return {
    title: event ? `Participants - ${event.title} | EventX` : 'Participants | EventX',
    description: event ? `View participants registered for ${event.title}` : 'View event participants'
  }
}

export const revalidate = 0 // Always fresh data

export default async function ParticipantsPage({ params }) {
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
    .eq('id', params.eventId)
    .single()

  if (eventError || !event) {
    redirect('/admin/events')
  }

  // 4. Verify Permission
  const canManage = isSuperAdmin || event.created_by === user.id
  if (!canManage) {
    redirect('/admin/events')
  }

  // 5. Fetch All Participants
  const { data: allParticipants } = await supabaseAdmin
    .from('participants')
    .select('*')
    .eq('event_id', params.eventId)
    .order('created_at', { ascending: false })

  // 6. Calculate Stats
  const stats = {
    total: allParticipants?.length || 0,
    approved: allParticipants?.filter(p => p.status === 'approved').length || 0,
    pending: allParticipants?.filter(p => p.status === 'pending').length || 0,
    rejected: allParticipants?.filter(p => p.status === 'rejected').length || 0
  }

  // 7. Filter for approved participants only (for the table)
  const approvedParticipants = allParticipants?.filter(p => p.status === 'approved') || []

  // 8. Extract Dynamic Fields from Event Form Fields
  const formFields = event.form_fields || []
  const dynamicFields = formFields.map(f => ({
    label: f.label,
    key: f.id
  }))

  // 9. Render Client Component with SSR Data
  return (
    <ParticipantsClient 
      event={event} 
      participants={approvedParticipants}
      dynamicFields={dynamicFields}
      stats={stats}
    />
  )
}