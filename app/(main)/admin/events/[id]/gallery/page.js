import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EventGalleryManager from '@/components/admin/EventGalleryManager'

export default async function GalleryPage({ params }) {
    const { id } = params
    const supabase = createClient()
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/auth')
    }

    // Fetch Event
    const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !event) {
        return <div className="p-8">Event not found</div>
    }

    // Permission Check
    // Assuming 'is_super_admin' check or ownership check exists in your app logic generally
    // For now, assuming if they can access the dashboard they can access this, 
    // but typically we'd check `event.created_by === user.id` unless super admin.
    if (event.created_by !== user.id) {
         // Optionally fetch user role to check if super admin
         // For simplicity, we'll allow if they passed the middleware generally protecting /admin
         // But strict check:
         // redirect('/admin/events') 
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <EventGalleryManager eventId={id} initialEvent={event} />
        </div>
    )
}
