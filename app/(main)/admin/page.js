import Link from 'next/link'
import { redirect } from 'next/navigation'
import GradientText from '@/components/GradientText'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, LogOut, TrendingUp, ShieldCheck, Activity } from 'lucide-react'
import LastWordGradientText from '@/components/LastWordGradientText'
import ClientLogoutButton from '@/components/admin/ClientLogoutButton' // We'll need to create this

export const metadata = {
  title: 'Admin Dashboard | EventX',
  description: 'Manage events and participants',
}

export default async function AdminDashboard() {
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
  
  if (!role || (role !== 'admin' && role !== 'super_admin')) {
    redirect('/') // Not an admin
  }

  // 3. Fetch Events & Stats
  // We mirror the optimized logic from /api/events route but run it here on the server
  let query = supabase
    .from("events")
    .select("id, is_active, event_end_date, created_by")
  
  // Regular admins only see their own events for "My Events" count
  // But for "Total Events" system-wide stats, we might want to restrict plain admins?
  // The original client code did:
  // myEvents = isSuperAdmin ? allEvents : filter(created_by === me)
  // stats.myEvents = myEvents.length
  // stats.activeEvents = myEvents.filter(isActive).length
  // So standard admins ONLY saw stats for THEIR events. Let's keep that safely.
  
  if (!isSuperAdmin) {
    query = query.eq('created_by', user.id)
  }

  const { data: events, error } = await query
  
  let stats = {
    totalEvents: 0,
    activeEvents: 0,
    totalParticipants: 0,
    myEvents: 0
  }

  if (events) {
    const now = new Date()
    
    // Calculate Active Events
    const activeEventsList = events.filter(e => {
        const eventEndDate = e.event_end_date ? new Date(e.event_end_date) : null;
        // Logic: Must be marked is_active AND (no end date OR end date is in future)
        const isExpired = eventEndDate && now > eventEndDate;
        return e.is_active && !isExpired; 
    })

    // Calculate Total Participants
    // We need a separate query for this to be accurate and fast
    // Using the RPC if available is best, or a simple count query
    // Since we are iterating, let's just count participants for these events
    const eventIds = events.map(e => e.id)
    let totalParticipants = 0
    
    if (eventIds.length > 0) {
        // Use RPC if possible, else simple count
        // For simplicity and speed in this refactor, let's use the efficient count query
        const { count } = await supabase
            .from('participants')
            .select('*', { count: 'exact', head: true })
            .in('event_id', eventIds)
            // .eq('status', 'approved') // Optionally only count approved? original code summed 'approved_count'
            // The original logic summed `approved_count` from api, which usually implies approved.
            // Let's count all or just approved? Let's match original intent: "Total Registrations" usually means all attempts or approved?
            // "Total Registrations" usually implies distinct signups.
            // Let's count *approved* to be safe and consistent with "participants" meaning "people attending".
            .eq('status', 'approved') 
            
        totalParticipants = count || 0
    }

    stats = {
      totalEvents: events.length, // This is effectively "My Events" for regular admins, or "All" for super
      activeEvents: activeEventsList.length,
      totalParticipants: totalParticipants,
      myEvents: events.length
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
            <LastWordGradientText>{isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}</LastWordGradientText>
          </h1>
          <div className="flex items-center gap-2 text-gray-400">
             <ShieldCheck size={16} className={isSuperAdmin ? "text-brand-orange" : "text-blue-400"} />
             <span>Welcome back, <span className="font-semibold text-gray-200">{user.email}</span></span>
          </div>
        </div>
        
        {/* Client Component for Logout to handle client-side router */}
        <ClientLogoutButton /> 
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card className="border-gray-800 bg-black/40 backdrop-blur-md hover:bg-black/60 transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">
              {isSuperAdmin ? 'Total System Events' : 'My Events'}
            </CardTitle>
            <Calendar className="text-brand-orange group-hover:scale-110 transition-transform duration-300" size={20} />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                {stats.myEvents}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isSuperAdmin ? 'Managed across the platform' : 'Created by you'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-black/40 backdrop-blur-md hover:bg-black/60 transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">
              Active Events
            </CardTitle>
            <Activity className="text-green-400 group-hover:scale-110 transition-transform duration-300" size={20} />
          </CardHeader>
          <CardContent>
             <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
                {stats.activeEvents}
            </div>
            <p className="text-xs text-gray-500 mt-1">Currently live & running</p>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-black/40 backdrop-blur-md hover:bg-black/60 transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">
              Total Registrations
            </CardTitle>
            <Users className="text-purple-400 group-hover:scale-110 transition-transform duration-300" size={20} />
          </CardHeader>
          <CardContent>
             <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                {stats.totalParticipants}
            </div>
            <p className="text-xs text-gray-500 mt-1">Confirmed participants</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="text-brand-red" size={24} />
          <span className="text-white">Quick Actions</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <Link href="/admin/events" className="block group">
            <Card className="h-full border-gray-800 bg-gradient-to-br from-gray-900 to-black hover:from-gray-800 hover:to-gray-900 transition-all duration-300 hover:shadow-xl hover:shadow-brand-red/10 border-l-4 border-l-brand-red">
            <CardHeader>
                <CardTitle className="text-xl group-hover:text-brand-red transition-colors">Manage Events</CardTitle>
                <CardDescription className="text-gray-400">
                Create, edit, and delete events. Build custom registration forms and manage event lifecycles.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center text-sm font-semibold text-brand-red mt-2">
                    Access Event Control <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
            </CardContent>
            </Card>
        </Link>
        
         {/* Note: The old 'View Participants' card was just a shallow link to events page anyway. 
             If we want distinct functionality, we can link to a participants summary, but linking to events is fine.
             Let's make it look distinct. */}
        <Link href="/admin/events" className="block group">
            <Card className="h-full border-gray-800 bg-gradient-to-br from-gray-900 to-black hover:from-gray-800 hover:to-gray-900 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 border-l-4 border-l-blue-500">
            <CardHeader>
                <CardTitle className="text-xl group-hover:text-blue-400 transition-colors">View Participants</CardTitle>
                <CardDescription className="text-gray-400">
                See all registrations, approve/reject candidates, and export data.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center text-sm font-semibold text-blue-400 mt-2">
                    View Data <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
            </CardContent>
            </Card>
        </Link>
      </div>
    </div>
  )
}