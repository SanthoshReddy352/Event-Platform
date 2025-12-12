import { createClient, supabaseAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SubmissionsClient from './SubmissionsClient'

export async function generateMetadata({ params }) {
  const supabase = supabaseAdmin || createClient()
  
  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', params.id)
    .single()

  return {
    title: event ? `Submissions - ${event.title} | EventX` : 'Submissions | EventX',
    description: event ? `View project submissions for ${event.title}` : 'View hackathon submissions'
  }
}

export const revalidate = 0 // Always fresh data

export default async function SubmissionsPage({ params }) {
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

  // 5. Fetch Participants with Submissions
  const { data: allParticipants } = await supabaseAdmin
    .from('participants')
    .select('*')
    .eq('event_id', params.id)
    .order('submitted_at', { ascending: false })

  // 6. Enrich Participants with Email from Auth (if available)
  if (allParticipants && allParticipants.length > 0) {
      const userIds = allParticipants.map(p => p.user_id).filter(Boolean);
      
      // Fetch Auth Users (Emails) - Limit 1000 for now to be safe
      const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000
      });

      const emailMap = {};
      if (users) {
          users.forEach(u => { emailMap[u.id] = u.email; });
      }

      allParticipants.forEach(p => {
          // Prefer auth email, fallback to response email
          p.participant_email = emailMap[p.user_id] || p.responses?.['Email'] || p.responses?.['email'] || 'N/A';
      });
  }

  // 7. Filter for participants who have submitted
  const submissions = allParticipants?.filter(p => p.submitted_at && p.submission_data) || []

  // 8. Calculate Stats
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  const stats = {
    total: submissions.length,
    recent24h: submissions.filter(s => new Date(s.submitted_at) > twentyFourHoursAgo).length
  }

  // 9. Extract Dynamic Fields from Event Submission Form Fields
  const formFields = event.submission_form_fields || []
  const dynamicFields = formFields.map(f => ({
    label: f.label,
    key: f.id
  }))

  // 10. Render Client Component with SSR Data
  return (
    <SubmissionsClient 
      event={event} 
      submissions={submissions}
      dynamicFields={dynamicFields}
      stats={stats}
    />
  )
}
