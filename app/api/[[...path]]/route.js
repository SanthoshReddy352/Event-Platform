import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 

// Helper function to extract path segments
function getPathSegments(request) {
  const url = new URL(request.url)
  const pathname = url.pathname.replace('/api/', '')
  const segments = pathname.split('/').filter(Boolean)
  return segments
}

// Helper function to get query params
function getQueryParams(request) {
  const url = new URL(request.url)
  return Object.fromEntries(url.searchParams.entries())
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle OPTIONS request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// Helper to get user and role from request header
async function getAdminUser(request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, role: null, error: new Error('No Authorization header') }
  }

  const token = authHeader.split(' ')[1]
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { 'Authorization': `Bearer ${token}` },
    },
  })
  
  const { data: { user }, error } = await userSupabase.auth.getUser()

  if (error || !user) {
      return { user: null, role: null, error }
  }
  
  // Use service key to check the admin_users table
  const { data: adminData, error: roleError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle(); // MODIFIED: Use .maybeSingle() instead of .single()

  if (roleError) {
      // This is a real database error, not "not found"
      return { user, role: null, error: roleError }
  }
  
  if (!adminData) { // MODIFIED: Explicitly check for no data
      return { user, role: null, error: new Error('User is not an admin.') }
  }

  return { user, role: adminData.role, error: null }
}


// GET Handler
export async function GET(request) {
  try {
    const segments = getPathSegments(request)
    const params = getQueryParams(request)

    // GET /api/events - Get all events or filtered events
    if (segments[0] === 'events' && !segments[1]) {
      let query = supabase
        .from('events')
        .select('*, created_by') // MODIFIED: Select created_by
        .order('created_at', { ascending: false })

      // Filter by active status
      if (params.active === 'true') {
        const now = new Date().toISOString();
        query = query
          .eq('is_active', true) 
          .or(`event_end_date.gt.${now},event_end_date.is.null`)
      }

      // Limit results
      if (params.limit) {
        query = query.limit(parseInt(params.limit))
      }

      const { data, error } = await query

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        { success: true, events: data },
        { headers: corsHeaders }
      )
    }

    // GET /api/events/:id - Get single event
    if (segments[0] === 'events' && segments[1]) {
      const { data, error } = await supabase
        .from('events')
        .select('*, created_by') // MODIFIED: Select created_by
        .eq('id', segments[1])
        .single()

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        { success: true, event: data },
        { headers: corsHeaders }
      )
    }
    
    // GET /api/profile - Get current user profile
    if (segments[0] === 'profile') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
        }
        const token = authHeader.split(' ')[1]
        const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { 'Authorization': `Bearer ${token}` } },
        })
        const { data: { user }, error: authError } = await userSupabase.auth.getUser()
        
        if (!user) {
            return NextResponse.json(
                { success: false, error: authError?.message || 'Unauthorized' },
                { status: 401, headers: corsHeaders }
            )
        }
        
        const { data, error } = await supabase
          .from('profiles')
          .select('name, phone_number, created_at, updated_at')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          return NextResponse.json(
            { success: false, error: error.message },
            { status: 500, headers: corsHeaders }
          )
        }

        return NextResponse.json(
          { success: true, profile: data || { id: user.id, name: '', phone_number: '', email: user.email } },
          { headers: corsHeaders }
        )
    }


    // GET /api/participants/:eventId - Get participants for an event
    if (segments[0] === 'participants' && segments[1] && segments[1] !== 'count') {
      const eventId = segments[1];
      
      // Check if it's a user checking their own registration
      if (params.userId) {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
        }
        const token = authHeader.split(' ')[1]
        const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { 'Authorization': `Bearer ${token}` } },
        })
        const { data: { user }, error: authError } = await userSupabase.auth.getUser()

        if (authError || !user || user.id !== params.userId) {
             return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403, headers: corsHeaders })
        }
        
        const { data, error } = await supabase
            .from('participants')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle()

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
        }
        return NextResponse.json({ success: true, participant: data }, { headers: corsHeaders })
        
      } else {
        // This is an ADMIN request for all participants
        const { user, role, error: adminError } = await getAdminUser(request);
        if (adminError || !user) {
            return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
        }
        
        // Check permissions: Must be super_admin or event owner
        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('created_by')
            .eq('id', eventId)
            .single();

        if (eventError) {
             return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404, headers: corsHeaders })
        }
        
        const canManage = role === 'super_admin' || eventData.created_by === user.id;
        
        if (!canManage) {
            return NextResponse.json({ success: false, error: 'Forbidden: You do not own this event' }, { status: 403, headers: corsHeaders })
        }
        
        // Permission granted, fetch participants
        const { data, error } = await supabase
            .from('participants')
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false })
            
        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
        }
        
        return NextResponse.json({ success: true, participants: data }, { headers: corsHeaders })
      }
    }

    // GET /api/participants/count - Get total participant count
    if (segments[0] === 'participants' && segments[1] === 'count') {
      const { count, error } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        { success: true, count },
        { headers: corsHeaders }
      )
    }

    // GET /api/participants/pending - Get all pending registrations for admin
    if (segments[0] === 'participants' && segments[1] === 'pending') {
      const { user, role, error: adminError } = await getAdminUser(request);
      if (adminError || !user) {
          return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      // Build query based on role
      let query = supabase
        .from('participants')
        .select(`
          *,
          event:events(id, title, created_by)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      // If not super_admin, only show pending for their own events
      if (role !== 'super_admin') {
        // First get events created by this admin
        const { data: adminEvents, error: eventsError } = await supabase
          .from('events')
          .select('id')
          .eq('created_by', user.id);
        
        if (eventsError) {
          return NextResponse.json({ success: false, error: eventsError.message }, { status: 500, headers: corsHeaders })
        }
        
        const eventIds = adminEvents.map(e => e.id);
        if (eventIds.length === 0) {
          return NextResponse.json({ success: true, participants: [] }, { headers: corsHeaders })
        }
        
        query = query.in('event_id', eventIds);
      }
      
      const { data, error } = await query;
      
      if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }
      
      return NextResponse.json({ success: true, participants: data }, { headers: corsHeaders })
    }

    // Default GET - Health check
    if (segments.length === 0) {
      return NextResponse.json(
        { message: 'IEEE Club API - OK' },
        { headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Route not found' },
      { status: 404, headers: corsHeaders }
    )
  } catch (error) {
    console.error('GET Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST Handler
export async function POST(request) {
  try {
    const segments = getPathSegments(request)
    const body = await request.json()

    // POST /api/events - Create new event
    if (segments[0] === 'events' && !segments[1]) {
      // MODIFIED: Get admin user first
      const { user, role, error: adminError } = await getAdminUser(request);
      if (adminError || !user || !role) { // Must have an admin role
          return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      const eventData = {
        title: body.title,
        description: body.description,
        banner_url: body.banner_url,
        event_date: body.event_date || null,
        event_end_date: body.event_end_date || null,
        is_active: body.is_active !== undefined ? body.is_active : true,
        registration_open: body.registration_open !== undefined ? body.registration_open : true,
        registration_start: body.registration_start || null,
        registration_end: body.registration_end || null,
        form_fields: body.form_fields || [],
        created_by: user.id, // MODIFIED: Set the owner
      }

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        { success: true, event: data },
        { headers: corsHeaders }
      )
    }

    // POST /api/participants - Create new participant registration
    if (segments[0] === 'participants' && !segments[1]) {
      const authHeader = request.headers.get('Authorization')
      let participantUserId = body.user_id; 
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1]
          const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
              global: { headers: { 'Authorization': `Bearer ${token}` } },
          })
          const { data: { user } } = await userSupabase.auth.getUser()
          if(user) {
              participantUserId = user.id;
          }
      }
      
      if (!participantUserId) {
          return NextResponse.json({ success: false, error: 'Unauthorized: Missing user ID' }, { status: 401, headers: corsHeaders })
      }
      
      // MODIFIED: Check for existing registration (approved or pending)
      const { data: existingReg } = await supabase
        .from('participants')
        .select('id, status')
        .eq('event_id', body.event_id)
        .eq('user_id', participantUserId)
        .maybeSingle();
      
      // If there's an approved or pending registration, don't allow re-registration
      if (existingReg && (existingReg.status === 'approved' || existingReg.status === 'pending')) {
        return NextResponse.json(
          { success: false, error: `You already have a ${existingReg.status} registration for this event.` },
          { status: 409, headers: corsHeaders }
        )
      }
      
      // If rejected, allow re-registration (will create new entry)
      const participantData = {
        event_id: body.event_id,
        user_id: participantUserId, 
        responses: body.responses,
        status: 'pending', // MODIFIED: Default to pending
      }

      const { data, error } = await supabase
        .from('participants')
        .insert([participantData])
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: corsHeaders }
        )
      }

      // Send email notification to event admin about new registration
      try {
        // Get event details
        const { data: eventData } = await supabase
          .from('events')
          .select('title, event_date, created_by')
          .eq('id', body.event_id)
          .single()
        
        if (eventData && eventData.created_by) {
          // Get admin email
          const { data: { user: adminUser } } = await supabase.auth.admin.getUserById(eventData.created_by)
          
          if (adminUser?.email) {
            const participantName = body.responses?.['Name'] || body.responses?.['Full Name'] || body.responses?.['name'] || 'Participant'
            const participantEmail = body.responses?.['Email'] || body.responses?.['email'] || 'N/A'
            
            // Import and send email
            const { sendAdminNotification } = await import('@/lib/email')
            await sendAdminNotification({
              to: adminUser.email,
              adminName: adminUser.user_metadata?.name || adminUser.email,
              eventTitle: eventData.title,
              participantName,
              participantEmail
            })
          }
        }
      } catch (emailError) {
        console.error('Error sending admin notification email:', emailError)
        // Don't fail the registration if email fails
      }
      
      return NextResponse.json(
        { success: true, participant: data },
        { headers: corsHeaders }
      )
    }

    // POST /api/contact - Submit contact form
    if (segments[0] === 'contact') {
      const contactData = {
        name: body.name,
        email: body.email,
        message: body.message,
      }

      const { data, error } = await supabase
        .from('contact_submissions')
        .insert([contactData])
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        { success: true, submission: data },
        { headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Route not found' },
      { status: 404, headers: corsHeaders }
    )
  } catch (error) {
    console.error('POST Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// PUT Handler
export async function PUT(request) {
  try {
    const segments = getPathSegments(request)
    const body = await request.json()
    
    // PUT /api/profile - Update current user profile
    if (segments[0] === 'profile') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader) {
             return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
        }
        const token = authHeader.split(' ')[1]
        const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { 'Authorization': `Bearer ${token}` } },
        })
        const { data: { user }, error: authError } = await userSupabase.auth.getUser()
        
        if (!user) {
            return NextResponse.json(
                { success: false, error: authError?.message || 'Unauthorized' },
                { status: 401, headers: corsHeaders }
            )
        }
        
        const updateData = {
            id: user.id,
            name: body.name,
            phone_number: body.phone_number,
            updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
            .from('profiles')
            .upsert(updateData)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
        }

        return NextResponse.json({ success: true, profile: data }, { headers: corsHeaders })
    }


    // PUT /api/events/:id - Update event
    if (segments[0] === 'events' && segments[1]) {
      const eventId = segments[1]
      
      const { user, role, error: adminError } = await getAdminUser(request);
      if (adminError || !user) {
          return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('created_by')
          .eq('id', eventId)
          .single();

      if (eventError) {
           return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404, headers: corsHeaders })
      }
      
      const canManage = role === 'super_admin' || eventData.created_by === user.id;
      
      if (!canManage) {
          return NextResponse.json({ success: false, error: 'Forbidden: You do not own this event' }, { status: 403, headers: corsHeaders })
      }

      // Permission Granted, proceed with update
      const updateData = {}
      if (body.title !== undefined) updateData.title = body.title
      if (body.description !== undefined) updateData.description = body.description
      if (body.banner_url !== undefined) updateData.banner_url = body.banner_url
      if (body.event_date !== undefined) updateData.event_date = body.event_date
      if (body.event_end_date !== undefined) updateData.event_end_date = body.event_end_date
      if (body.is_active !== undefined) updateData.is_active = body.is_active
      if (body.registration_open !== undefined) updateData.registration_open = body.registration_open
      if (body.registration_start !== undefined) updateData.registration_start = body.registration_start
      if (body.registration_end !== undefined) updateData.registration_end = body.registration_end
      if (body.form_fields !== undefined) updateData.form_fields = body.form_fields
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', eventId)
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        { success: true, event: data },
        { headers: corsHeaders }
      )
    }

    // PUT /api/participants/:id/approve - Approve participant registration
    if (segments[0] === 'participants' && segments[1] && segments[2] === 'approve') {
      const participantId = segments[1];
      
      const { user, role, error: adminError } = await getAdminUser(request);
      if (adminError || !user) {
          return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      // Get participant and event info
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('*, event:events(id, title, created_by)')
        .eq('id', participantId)
        .single();
      
      if (participantError || !participant) {
        return NextResponse.json({ success: false, error: 'Participant not found' }, { status: 404, headers: corsHeaders })
      }
      
      // Check permission
      const canManage = role === 'super_admin' || participant.event.created_by === user.id;
      if (!canManage) {
        return NextResponse.json({ success: false, error: 'Forbidden: You do not own this event' }, { status: 403, headers: corsHeaders })
      }
      
      // Update status to approved
      const { data, error } = await supabase
        .from('participants')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', participantId)
        .select()
        .single();
      
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }
      
      // Send approval email to participant
      try {
        const { data: { user: participantUser } } = await supabase.auth.admin.getUserById(participant.user_id)
        
        if (participantUser?.email) {
          const participantName = participant.responses?.['Name'] || participant.responses?.['Full Name'] || participant.responses?.['name'] || 'Participant'
          
          const { sendApprovalEmail } = await import('@/lib/email')
          await sendApprovalEmail({
            to: participantUser.email,
            participantName,
            eventTitle: participant.event.title,
            eventDate: participant.event.event_date
          })
        }
      } catch (emailError) {
        console.error('Error sending approval email:', emailError)
        // Don't fail the approval if email fails
      }
      
      return NextResponse.json({ success: true, participant: data }, { headers: corsHeaders })
    }

    // PUT /api/participants/:id/reject - Reject participant registration
    if (segments[0] === 'participants' && segments[1] && segments[2] === 'reject') {
      const participantId = segments[1];
      
      const { user, role, error: adminError } = await getAdminUser(request);
      if (adminError || !user) {
          return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      // Get participant and event info
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('*, event:events(id, title, created_by)')
        .eq('id', participantId)
        .single();
      
      if (participantError || !participant) {
        return NextResponse.json({ success: false, error: 'Participant not found' }, { status: 404, headers: corsHeaders })
      }
      
      // Check permission
      const canManage = role === 'super_admin' || participant.event.created_by === user.id;
      if (!canManage) {
        return NextResponse.json({ success: false, error: 'Forbidden: You do not own this event' }, { status: 403, headers: corsHeaders })
      }
      
      // Update status to rejected
      const { data, error } = await supabase
        .from('participants')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', participantId)
        .select()
        .single();
      
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }
      
      // TODO: Send rejection email to participant
      
      return NextResponse.json({ success: true, participant: data }, { headers: corsHeaders })
    }

    return NextResponse.json(
      { success: false, error: 'Route not found' },
      { status: 404, headers: corsHeaders }
    )
  } catch (error) {
    console.error('PUT Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE Handler
export async function DELETE(request) {
  try {
    const segments = getPathSegments(request)

    // DELETE /api/events/:id - Delete event
    if (segments[0] === 'events' && segments[1]) {
      const eventId = segments[1]

      const { user, role, error: adminError } = await getAdminUser(request);
      if (adminError || !user) {
          return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('created_by')
          .eq('id', eventId)
          .single();

      if (eventError) {
           return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404, headers: corsHeaders })
      }
      
      const canManage = role === 'super_admin' || eventData.created_by === user.id;
      
      if (!canManage) {
          return NextResponse.json({ success: false, error: 'Forbidden: You do not own this event' }, { status: 403, headers: corsHeaders })
      }

      // Permission Granted, proceed with delete
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        { success: true, message: 'Event deleted successfully' },
        { headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Route not found' },
      { status: 404, headers: corsHeaders }
    )
  } catch (error) {
    console.error('DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}