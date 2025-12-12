import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import LastWordGradientText from '@/components/LastWordGradientText'
import AdminEventsClient from './AdminEventsClient'
import AdminEventStatsSidebar from './AdminEventStatsSidebar'

export const metadata = {
  title: 'Manage Events | EventX',
  description: 'Create and manage hackathon events, workshops, and competitions.',
}

export default async function AdminEventsPage() {
  const supabase = createClient()

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch Admin Role
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()
  
  const role = adminUser?.role
  const isSuperAdmin = role === 'super_admin'
  const isAuthorized = role === 'admin' || isSuperAdmin
  
  if (!isAuthorized) {
    redirect('/')
  }

  // 3. Fetch Events
  let query = supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  if (!isSuperAdmin) {
    query = query.eq('created_by', user.id)
  }

  const { data: events, error } = await query

  if (error) {
    console.error("Error fetching events:", error)
  }

  // 4. Fetch Participant Counts for each event
  const eventIds = (events || []).map(e => e.id)
  let participantCounts = {}
  let totalParticipants = 0

  if (eventIds.length > 0) {
    const { data: participants, error: partError } = await supabase
      .from('participants')
      .select('event_id')
      .in('event_id', eventIds)

    if (!partError && participants) {
      // Count participants per event
      participants.forEach(p => {
        participantCounts[p.event_id] = (participantCounts[p.event_id] || 0) + 1
        totalParticipants++
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <LastWordGradientText>Manage Events</LastWordGradientText>
          </h1>
          <p className="text-gray-400">
            You have <span className="text-brand-red font-semibold">{events?.length || 0}</span> event{(events?.length || 0) !== 1 && 's'} to manage.
          </p>
        </div>
        <Link href="/admin/events/new">
          <Button className="bg-brand-gradient text-white shadow-lg shadow-brand-red/20 hover:shadow-brand-red/40 transition-all hover:-translate-y-0.5">
            <Plus size={18} className="mr-2" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column - Event List */}
        <div className="lg:col-span-8 w-full">
          <AdminEventsClient 
            events={events || []} 
            userId={user.id} 
            isSuperAdmin={isSuperAdmin}
            participantCounts={participantCounts}
          />
        </div>

        {/* Right Column - Stats Sidebar */}
        <div className="lg:col-span-4 w-full sticky top-24">
          <AdminEventStatsSidebar 
            events={events || []} 
            totalParticipants={totalParticipants}
          />
        </div>
      </div>
    </div>
  )
}