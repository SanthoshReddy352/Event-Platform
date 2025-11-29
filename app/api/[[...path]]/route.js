import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server' // Uses your centralized admin client

import { 
  sendAdminNotification, 
  sendApprovalEmail, 
  sendRejectionEmail,
  sendContactEmailToAdmin 
} from '@/lib/email'

// Initialize Anon client for verifying user tokens (checking who the caller is)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
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
  
  // Create a temporary client with the user's token to verify identity
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { 'Authorization': `Bearer ${token}` },
    },
  })
  
  const { data: { user }, error } = await userSupabase.auth.getUser()

  if (error || !user) {
      return { user: null, role: null, error }
  }
  
  // Use the Admin client to check the role in the database (bypassing RLS if necessary for the check)
  const { data: adminData, error: roleError } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle(); 

  if (roleError) {
      return { user, role: null, error: roleError }
  }
  
  if (!adminData) { 
      return { user, role: null, error: new Error('User is not an admin.') }
  }

  return { user, role: adminData.role, error: null }
}

// =================================================================================
// GET HANDLER
// =================================================================================
export async function GET(request) {
  try {
    const segments = getPathSegments(request)
    const params = getQueryParams(request)

    // GET /api/clubs - Get all clubs with profiles
    if (segments[0] === 'clubs' && !segments[1]) {
      const { data, error } = await supabaseAdmin
        .from('admin_users')
        .select('club_name, club_logo_url')
        .not('club_name', 'is', null)
        .not('club_name', 'eq', '')
        .not('club_logo_url', 'is', null)
        .not('club_logo_url', 'eq', '');

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }
      
      const uniqueClubs = data.reduce((acc, club) => {
        if (!acc.find(item => item.club_name === club.club_name)) {
          acc.push(club);
        }
        return acc;
      }, []);

      return NextResponse.json({ success: true, clubs: uniqueClubs }, { headers: corsHeaders })
    }

    // GET /api/events - Get all events or filtered events
    if (segments[0] === 'events' && !segments[1]) {
      // --- Cleanup logic ---
      const now = new Date().toISOString();
      try {
        const { data: completedEventIds } = await supabaseAdmin
          .from('events')
          .select('id')
          .lt('event_end_date', now); 

        if (completedEventIds && completedEventIds.length > 0) {
          await supabaseAdmin
            .from('participants')
            .delete()
            .eq('status', 'pending') 
            .in('event_id', completedEventIds.map(e => e.id));
        }
      } catch (cleanupErr) {
        console.error('Exception during registration cleanup:', cleanupErr.message);
      }
      // --- End cleanup logic ---

      let query = supabaseAdmin
        .from('events')
        .select(`
          *, 
          created_by, 
          club:created_by(club_name, club_logo_url)
        `)
        .order('created_at', { ascending: false })

      if (params.active === 'true') {
        query = query.eq('is_active', true)
      }

      if (params.limit) {
        query = query.limit(parseInt(params.limit))
      }

      const { data, error } = await query

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }
      
      return NextResponse.json({ success: true, events: data }, { headers: corsHeaders })
    }

    // GET /api/events/:id - Get single event
    if (segments[0] === 'events' && segments[1]) {
      const { data, error } = await supabaseAdmin
        .from('events')
        .select(`
          *, 
          created_by, 
          club:created_by(club_name, club_logo_url)
        `)
        .eq('id', segments[1])
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404, headers: corsHeaders })
      }
      
      return NextResponse.json({ success: true, event: data }, { headers: corsHeaders })
    }
    
    // GET /api/profile - Get current user profile
    if (segments[0] === 'profile') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
        }
        const token = authHeader.split(' ')[1]
        
        // We use a clean anon client just to decode/verify the token
        const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { 'Authorization': `Bearer ${token}` } },
        })
        const { data: { user }, error: authError } = await userSupabase.auth.getUser()
        
        if (!user) {
            return NextResponse.json({ success: false, error: authError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
        }
        
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('name, phone_number, created_at, updated_at')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
        }
        
        return NextResponse.json(
          { success: true, profile: { ...(data || {}), email: user.email } },
          { headers: corsHeaders }
        )
    }

    // GET /api/participants/count - Get total participant count
    if (segments[0] === 'participants' && segments[1] === 'count') {
      const { count, error } = await supabaseAdmin
        .from('participants')
        .select('*', { count: 'exact', head: true })

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }

      return NextResponse.json({ success: true, count }, { headers: corsHeaders })
    }

    // GET /api/participants/pending - Get all pending registrations for admin
    if (segments[0] === 'participants' && segments[1] === 'pending') {
      const { user, role, error: adminError } = await getAdminUser(request);
      if (adminError || !user) {
          return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      let query = supabaseAdmin
        .from('participants')
        .select(`
          *,
          event:events(id, title, created_by, form_fields)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      // If not super_admin, only show pending for their own events
      if (role !== 'super_admin') {
        const { data: adminEvents } = await supabaseAdmin
          .from('events')
          .select('id')
          .eq('created_by', user.id);
        
        const eventIds = adminEvents ? adminEvents.map(e => e.id) : [];
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

    // GET /api/participants/:eventId - Get participants for an event
    if (segments[0] === 'participants' && segments[1]) {
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
        
        const { data, error } = await supabaseAdmin
            .from('participants')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }) 

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
        }
        return NextResponse.json({ success: true, participants: data }, { headers: corsHeaders })
        
      } else {
        // This is an ADMIN request for all participants
        const { user, role, error: adminError } = await getAdminUser(request);
        if (adminError || !user) {
            return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
        }
        
        const { data: eventData, error: eventError } = await supabaseAdmin
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
        
        const { data, error } = await supabaseAdmin
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

    // Default GET - Health check
    if (segments.length === 0) {
      return NextResponse.json(
        { message: 'IEEE Club API - OK' },
        { headers: corsHeaders }
      )
    }

    return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404, headers: corsHeaders })
  } catch (error) {
    console.error('GET Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}

// =================================================================================
// POST HANDLER
// =================================================================================
export async function POST(request) {
  try {
    const segments = getPathSegments(request)
    const body = await request.json()

    const authHeader = request.headers.get('Authorization')
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    }

    // --- MANUAL ADMIN AUTH MANAGEMENT ---
    // POST /api/admin/users/:action
    if (segments[0] === 'admin' && segments[1] === 'users') {
        const { user, role, error: adminError } = await getAdminUser(request);
        if (adminError || !user) {
            return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
        }
        
        // Ensure only super_admins can manage other users this way
        if (role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Requires Super Admin privileges' }, { status: 403, headers: corsHeaders })
        }

        const action = segments[2];

        // 1. Invite User
        if (action === 'invite') {
            const { email } = body;
            const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
            if (error) throw error;
            return NextResponse.json({ success: true, user: data.user }, { headers: corsHeaders });
        }

        // 2. Confirm User (Manually verify email)
        if (action === 'confirm') {
            const { user_id } = body;
            const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { email_confirm: true });
            if (error) throw error;
            return NextResponse.json({ success: true, user: data.user }, { headers: corsHeaders });
        }

        // 3. Generate Link (Magic Link, Recovery, Invite)
        // Body: { type: 'magiclink' | 'recovery' | 'invite' | 'signup', email: '...' }
        if (action === 'generate_link') {
            const { type, email } = body;
            const { data, error } = await supabaseAdmin.auth.admin.generateLink({
                type: type, // e.g. "magiclink"
                email: email
            });
            if (error) throw error;
            
            // Returns: { user, action_link, email_otp, hashed_token, ... }
            return NextResponse.json({ 
                success: true, 
                link: data.properties, // Full properties object
                url: data.properties.action_link // The specific URL to send to user
            }, { headers: corsHeaders });
        }

        // 4. Update User Password (Manual Reset / Reauthentication)
        if (action === 'update_password') {
             const { user_id, password } = body;
             const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password: password });
             if (error) throw error;
             return NextResponse.json({ success: true, user: data.user }, { headers: corsHeaders });
        }
        
        return NextResponse.json({ success: false, error: 'Unknown admin action' }, { status: 404, headers: corsHeaders })
    }

    // POST /api/events - Create new event
    if (segments[0] === 'events' && !segments[1]) {
      const { user, role, error: adminError } = await getAdminUser(request);
      if (adminError || !user || !role) { 
          return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }

      if (!token) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Missing token' }, { status: 401, headers: corsHeaders })
      }
      
      const eventData = {
        title: body.title,
        description: body.description,
        banner_url: body.banner_url,
        event_date: body.event_date || null,
        event_end_date: body.event_end_date || null,
        is_active: body.is_active !== undefined ? body.is_active : false,
        registration_open: body.registration_open !== undefined ? body.registration_open : true,
        registration_start: body.registration_start || null,
        registration_end: body.registration_end || null,
        form_fields: body.form_fields || [],
        created_by: user.id, 
      }

      const { data, error } = await supabaseAdmin
        .from('events')
        .insert([eventData])
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }

      return NextResponse.json({ success: true, event: data }, { headers: corsHeaders })
    }

    // POST /api/participants - Create new participant registration
    if (segments[0] === 'participants' && !segments[1]) {
      let participantUserId = body.user_id; 
      
      if (token) {
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
      
      // Allow re-registration if rejected (check only for pending/approved)
      const { data: existingReg } = await supabaseAdmin
        .from('participants')
        .select('id, status')
        .eq('event_id', body.event_id)
        .eq('user_id', participantUserId)
        .in('status', ['pending', 'approved']) 
        .maybeSingle();
      
      if (existingReg) {
        return NextResponse.json(
          { success: false, error: `You already have a ${existingReg.status} registration for this event.` },
          { status: 409, headers: corsHeaders }
        )
      }
      
      const participantData = {
        event_id: body.event_id,
        user_id: participantUserId, 
        responses: body.responses,
        status: 'pending', 
      }

      const { data, error } = await supabaseAdmin
        .from('participants')
        .insert([participantData])
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }

      try {
        const { data: eventData } = await supabaseAdmin
          .from('events')
          .select('title, event_date, created_by')
          .eq('id', body.event_id)
          .single()
        
        if (eventData && eventData.created_by) {
          const { data: { user: adminUser } } = await supabaseAdmin.auth.admin.getUserById(eventData.created_by)
          
          if (adminUser?.email) {
            const participantName = body.responses?.['Name'] || body.responses?.['Full Name'] || body.responses?.['name'] || 'Participant'
            const participantEmail = body.responses?.['Email'] || body.responses?.['email'] || 'N/A'
            
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
      }
      
      return NextResponse.json({ success: true, participant: data }, { headers: corsHeaders })
    }

    // POST /api/contact - Submit contact form
    if (segments[0] === 'contact') {
      const contactData = {
        name: body.name,
        email: body.email,
        message: body.message,
      }

      const { data, error } = await supabaseAdmin
        .from('contact_submissions')
        .insert([contactData])
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }
      
      try {
        await sendContactEmailToAdmin({
          fromName: contactData.name,
          fromEmail: contactData.email,
          message: contactData.message
        });
      } catch (emailError) {
        console.error("Error sending contact email to admin:", emailError);
      }

      return NextResponse.json({ success: true, submission: data }, { headers: corsHeaders })
    }

    return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404, headers: corsHeaders })
  } catch (error) {
    console.error('POST Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}

// =================================================================================
// PUT HANDLER
// =================================================================================
export async function PUT(request) {
  try {
    const segments = getPathSegments(request)
    
    // PUT /api/profile - Update current user profile
    if (segments[0] === 'profile') {
        const body = await request.json()
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
            return NextResponse.json({ success: false, error: authError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
        }
        
        const updateData = {
            id: user.id,
            name: body.name,
            phone_number: body.phone_number,
            updated_at: new Date().toISOString()
        }

        const { data, error } = await supabaseAdmin
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
      const body = await request.json()
      const eventId = segments[1]
      
      const { user, role, error: adminError } = await getAdminUser(request);
      if (adminError || !user) {
          return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      const { data: eventData, error: eventError } = await supabaseAdmin
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

      const { data, error } = await supabaseAdmin
        .from('events')
        .update(updateData)
        .eq('id', eventId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }

      return NextResponse.json({ success: true, event: data }, { headers: corsHeaders })
    }

    // PUT /api/participants/:id/approve - Approve participant registration
    if (segments[0] === 'participants' && segments[1] && segments[2] === 'approve') {
      const participantId = segments[1];
      
      const { user, role, error: adminError } = await getAdminUser(request);
      if (adminError || !user) {
          return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      const { data: participant, error: participantError } = await supabaseAdmin
        .from('participants')
        .select('*, event:events(id, title, created_by, event_date, event_end_date)') 
        .eq('id', participantId)
        .single();
      
      if (participantError || !participant) {
        return NextResponse.json({ success: false, error: 'Participant not found' }, { status: 404, headers: corsHeaders })
      }
      
      const canManage = role === 'super_admin' || participant.event.created_by === user.id;
      if (!canManage) {
        return NextResponse.json({ success: false, error: 'Forbidden: You do not own this event' }, { status: 403, headers: corsHeaders })
      }
      
      const { data, error } = await supabaseAdmin
        .from('participants')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', participantId)
        .select()
        .single();
      
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }
      
      try {
        const { data: { user: participantUser } } = await supabaseAdmin.auth.admin.getUserById(participant.user_id)
        const { data: { user: adminUser } } = await supabaseAdmin.auth.admin.getUserById(participant.event.created_by)
        
        if (participantUser?.email && adminUser?.email) {
          const participantName = participant.responses?.['Name'] || participant.responses?.['Full Name'] || participant.responses?.['name'] || 'Participant'
          
          const { data: adminProfile } = await supabaseAdmin.from('admin_users').select('club_name, club_logo_url').eq('user_id', adminUser.id).single();
          const fromName = adminProfile?.club_name || participant.event.title;
          const clubLogoUrl = adminProfile?.club_logo_url || null;
          
          await sendApprovalEmail({
            to: participantUser.email,
            from: { name: fromName, email: adminUser.email },
            participantName,
            eventTitle: participant.event.title,
            eventStartDate: participant.event.event_date,
            eventEndDate: participant.event.event_end_date,
            clubLogoUrl: clubLogoUrl
          })
        }
      } catch (emailError) {
        console.error('Error sending approval email:', emailError)
      }
      
      return NextResponse.json({ success: true, participant: data }, { headers: corsHeaders })
    }

    // PUT /api/participants/:id/reject - Reject participant registration
    if (segments[0] === 'participants' && segments[1] && segments[2] === 'reject') {
      const body = await request.json()
      const reason = body.reason || null
      
      const participantId = segments[1];
      
      const { user, role, error: adminError } = await getAdminUser(request);
      if (adminError || !user) {
          return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      const { data: participant, error: participantError } = await supabaseAdmin
        .from('participants')
        .select('*, event:events(id, title, created_by, event_date, event_end_date)')
        .eq('id', participantId)
        .single();
      
      if (participantError || !participant) {
        return NextResponse.json({ success: false, error: 'Participant not found' }, { status: 404, headers: corsHeaders })
      }
      
      const canManage = role === 'super_admin' || participant.event.created_by === user.id;
      if (!canManage) {
        return NextResponse.json({ success: false, error: 'Forbidden: You do not own this event' }, { status: 403, headers: corsHeaders })
      }
      
      const { data, error } = await supabaseAdmin
        .from('participants')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason 
        })
        .eq('id', participantId)
        .select()
        .single();
      
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }
      
      try {
        const { data: { user: participantUser } } = await supabaseAdmin.auth.admin.getUserById(participant.user_id)
        const { data: { user: adminUser } } = await supabaseAdmin.auth.admin.getUserById(participant.event.created_by)
        
        if (participantUser?.email && adminUser?.email) {
          const participantName = participant.responses?.['Name'] || participant.responses?.['Full Name'] || participant.responses?.['name'] || 'Participant'

          const { data: adminProfile } = await supabaseAdmin.from('admin_users').select('club_name, club_logo_url').eq('user_id', adminUser.id).single();
          const fromName = adminProfile?.club_name || participant.event.title;
          const clubLogoUrl = adminProfile?.club_logo_url || null;
          
          await sendRejectionEmail({
            to: participantUser.email,
            from: { name: fromName, email: adminUser.email },
            participantName,
            eventTitle: participant.event.title,
            reason: reason,
            eventStartDate: participant.event.event_date,
            eventEndDate: participant.event.event_end_date,
            clubLogoUrl: clubLogoUrl
          })
        }
      } catch (emailError) {
        console.error('Error sending rejection email:', emailError)
      }
      
      return NextResponse.json({ success: true, participant: data }, { headers: corsHeaders })
    }

    return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404, headers: corsHeaders })
  } catch (error) {
    console.error('PUT Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}

// =================================================================================
// DELETE HANDLER
// =================================================================================
export async function DELETE(request) {
  try {
    const segments = getPathSegments(request)

    // DELETE /api/admin/users/delete
    if (segments[0] === 'admin' && segments[1] === 'users' && segments[2] === 'delete') {
        const body = await request.json();
        const { role, error } = await getAdminUser(request);
        if (error || role !== 'super_admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: corsHeaders })
        }
        
        const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(body.user_id);
        if (delError) {
            return NextResponse.json({ success: false, error: delError.message }, { status: 500, headers: corsHeaders })
        }
        
        return NextResponse.json({ success: true, message: 'User deleted' }, { headers: corsHeaders });
    }

    // DELETE /api/events/:id - Delete event
    if (segments[0] === 'events' && segments[1]) {
      const eventId = segments[1]

      const { user, role, error: adminError } = await getAdminUser(request);
      if (adminError || !user) {
          return NextResponse.json({ success: false, error: adminError?.message || 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      const { data: eventData, error: eventError } = await supabaseAdmin
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

      const { error } = await supabaseAdmin
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }

      return NextResponse.json({ success: true, message: 'Event deleted successfully' }, { headers: corsHeaders })
    }

    return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404, headers: corsHeaders })
  } catch (error) {
    console.error('DELETE Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}