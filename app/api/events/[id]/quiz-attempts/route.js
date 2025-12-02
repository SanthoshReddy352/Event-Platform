import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const supabase = createClient();
    const { id } = params;

    // 1. Check Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check Admin Status
    // We can query the public.admin_users table using the authenticated user's client
    // because RLS allows users to read their own admin status.
    const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

    if (adminError || !adminData) {
        return NextResponse.json({ success: false, error: 'Forbidden: Not an admin' }, { status: 403 });
    }

    // 3. Fetch Attempts using Service Role (to bypass RLS and get all users)
    if (!supabaseAdmin) {
        console.error("Supabase Admin client not initialized. Check SUPABASE_SERVICE_ROLE_KEY.");
        return NextResponse.json({ success: false, error: 'Server Configuration Error' }, { status: 500 });
    }

    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .eq('event_id', id)
      .order('score', { ascending: false });

    if (attemptsError) {
      throw attemptsError;
    }

    // 4. Fetch User Emails
    // Since we have the user_ids in the attempts, we can fetch their emails.
    // Ideally, we would join with a public profiles table, but if emails are only in auth.users,
    // we need to use the admin client to fetch them.
    
    // Optimization: Fetch all unique user IDs first
    const userIds = [...new Set(attempts.map(a => a.user_id))];
    
    // We can't easily "bulk fetch" users by ID array with standard Supabase Auth API in one go 
    // without using a raw query or looping. 
    // However, supabaseAdmin.auth.admin.listUsers() is for listing all users, which might be slow.
    // A better approach if we have a profiles table is to join with that.
    // But the requirement is to show emails. 
    
    // Let's try to fetch profiles first if they exist and have emails (unlikely for privacy).
    // Alternatively, we can use `supabaseAdmin.auth.admin.getUserById(uid)` in parallel, 
    // but that hits rate limits for many users.
    
    // BEST PRACTICE: The `admin_users` or `profiles` table should ideally have the info we need.
    // But `auth.users` is where the email is.
    
    // Let's use a Promise.all to fetch user details for the attempts. 
    // CAUTION: This might be slow for thousands of users.
    // For now, we'll assume a reasonable number of attempts.
    
    const attemptsWithEmails = await Promise.all(attempts.map(async (attempt) => {
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(attempt.user_id);
        return {
            ...attempt,
            email: user ? user.email : 'Unknown User'
        };
    }));

    return NextResponse.json({ success: true, attempts: attemptsWithEmails });

  } catch (error) {
    console.error('Error fetching quiz attempts:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
