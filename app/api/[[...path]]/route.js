import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server' // Uses your centralized admin client

import { 
  sendAdminNotification, 
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

      // 1. Fetch Events
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

      const { data: events, error } = await query

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }

      // 2. Fetch Approved Participant Counts Manually
      // We do this to ensure we ONLY count 'approved' participants, avoiding 'pending' or 'rejected'.
      if (events && events.length > 0) {
        const eventIds = events.map(e => e.id);
        
        // Fetch event_id for every approved participant in these events
        const { data: participants } = await supabaseAdmin
            .from('participants')
            .select('event_id')
            .eq('status', 'approved')
            .in('event_id', eventIds);
            
        // Calculate counts per event
        const counts = {};
        if (participants) {
            participants.forEach(p => {
                counts[p.event_id] = (counts[p.event_id] || 0) + 1;
            });
        }
        
        // Attach approved_count to each event
        events.forEach(e => {
            e.approved_count = counts[e.id] || 0;
        });
      }
      
      return NextResponse.json({ success: true, events: events }, { headers: corsHeaders })
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

    // GET /api/events/:eventId/scope-status - Get hackathon scope status for a user
    if (segments[0] === 'events' && segments[1] && segments[2] === 'scope-status') {
      const eventId = segments[1]
      const authHeader = request.headers.get('Authorization')
      
      if (!authHeader) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      const token = authHeader.split(' ')[1]
      const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { 'Authorization': `Bearer ${token}` } },
      })
      const { data: { user }, error: authError } = await userSupabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      // Get event details
      const { data: event } = await supabaseAdmin
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
      
      if (!event) {
        return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404, headers: corsHeaders })
      }
      
      // Get participant record
      const { data: participant } = await supabaseAdmin
        .from('participants')
        .select('*, selected_problem_id, submission_data, submitted_at')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle()
      
      if (!participant) {
        return NextResponse.json({ 
          success: false, 
          error: 'Not registered or not approved',
          isApproved: false 
        }, { status: 403, headers: corsHeaders })
      }
      
      // Calculate current phase based on time
      const now = new Date()
      const phases = {
        problem_selection: false,
        ppt_available: false,
        submission_open: false
      }
      
      if (event.problem_selection_start && event.problem_selection_end) {
        const start = new Date(event.problem_selection_start)
        const end = new Date(event.problem_selection_end)
        phases.problem_selection = now >= start && now <= end
      }
      
      if (event.ppt_release_time) {
        phases.ppt_available = now >= new Date(event.ppt_release_time)
      }
      
      if (event.submission_start && event.submission_end) {
        const start = new Date(event.submission_start)
        const end = new Date(event.submission_end)
        phases.submission_open = now >= start && now <= end
      }
      
      return NextResponse.json({ 
        success: true, 
        isApproved: true,
        phases,
        participant: {
          selected_problem_id: participant.selected_problem_id,
          has_submitted: !!participant.submitted_at
        },
        event: {
          ppt_template_url: event.ppt_template_url
        }
      }, { headers: corsHeaders })
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
        
        // Payment Fields
        is_paid: body.is_paid !== undefined ? body.is_paid : false,
        registration_fee: body.registration_fee !== undefined ? body.registration_fee : 0,

        // Hackathon Scope Fields
        event_type: body.event_type || 'other',
        problem_selection_start: body.problem_selection_start || null,
        problem_selection_end: body.problem_selection_end || null,
        ppt_template_url: body.ppt_template_url || null,
        ppt_release_time: body.ppt_release_time || null,
        submission_start: body.submission_start || null,
        submission_end: body.submission_end || null,
        submission_form_fields: body.submission_form_fields || [],

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
        status: 'approved', // Auto-approve free events
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

    // POST /api/events/:eventId/select-problem - Select a problem statement
    if (segments[0] === 'events' && segments[1] && segments[2] === 'select-problem') {
      const eventId = segments[1]
      
      if (!token) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { 'Authorization': `Bearer ${token}` } },
      })
      const { data: { user } } = await userSupabase.auth.getUser()
      
      if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      const { problem_id } = body
      
      // Use the stored procedure for concurrency-safe selection
      const { data, error } = await supabaseAdmin.rpc('check_and_select_problem', {
        p_user_id: user.id,
        p_event_id: eventId,
        p_problem_id: problem_id
      })
      
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400, headers: corsHeaders })
      }
      
      if (!data) {
        return NextResponse.json({ 
          success: false, 
          error: 'Problem statement is full or already selected' 
        }, { status: 409, headers: corsHeaders })
      }
      
      return NextResponse.json({ success: true, message: 'Problem selected successfully' }, { headers: corsHeaders })
    }

    // POST /api/events/:eventId/submit-project - Submit final project
    if (segments[0] === 'events' && segments[1] && segments[2] === 'submit-project') {
      const eventId = segments[1]
      
      if (!token) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { 'Authorization': `Bearer ${token}` } },
      })
      const { data: { user } } = await userSupabase.auth.getUser()
      
      if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
      }
      
      const { submission_data } = body
      
      // Update participant with submission
      const { data, error } = await supabaseAdmin
        .from('participants')
        .update({
          submission_data: submission_data,
          submitted_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .select()
        .single()
      
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
      }
      
      return NextResponse.json({ success: true, submission: data }, { headers: corsHeaders })
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
      
      // Payment Fields
      if (body.is_paid !== undefined) updateData.is_paid = body.is_paid
      if (body.registration_fee !== undefined) updateData.registration_fee = body.registration_fee

      // Hackathon Scope Fields
      if (body.event_type !== undefined) updateData.event_type = body.event_type
      if (body.problem_selection_start !== undefined) updateData.problem_selection_start = body.problem_selection_start
      if (body.problem_selection_end !== undefined) updateData.problem_selection_end = body.problem_selection_end
      if (body.ppt_template_url !== undefined) updateData.ppt_template_url = body.ppt_template_url
      if (body.ppt_release_time !== undefined) updateData.ppt_release_time = body.ppt_release_time
      if (body.submission_start !== undefined) updateData.submission_start = body.submission_start
      if (body.submission_end !== undefined) updateData.submission_end = body.submission_end
      if (body.submission_form_fields !== undefined) updateData.submission_form_fields = body.submission_form_fields

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