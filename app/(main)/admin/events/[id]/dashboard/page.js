import { createClient, supabaseAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export async function generateMetadata({ params }) {
  const supabase = supabaseAdmin || createClient()
  
  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', params.id)
    .single()

  return {
    title: event ? `${event.title} - Dashboard | EventX` : 'Event Dashboard | EventX',
    description: event ? `Manage ${event.title} - view registrations, stats, and settings.` : 'Event management dashboard'
  }
}

export const revalidate = 0 // Always fresh data

export default async function AdminEventDashboardPage({ params }) {
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

  // 5. Fetch Participant Stats
  const { data: participants } = await supabaseAdmin
    .from('participants')
    .select('status')
    .eq('event_id', params.id)

  const stats = {
    total: participants?.length || 0,
    approved: participants?.filter(p => p.status === 'approved').length || 0,
    pending: participants?.filter(p => p.status === 'pending').length || 0,
    rejected: participants?.filter(p => p.status === 'rejected').length || 0
  }

  // 6. Render Client Component with SSR Data
  return <DashboardClient event={event} stats={stats} />
}