'use client'

import { useEffect, useState } from 'react' // CORRECTED: Changed '=>' to 'from'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function ProtectedRoute({ children }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  const checkUser = async (session) => {
    let currentUser = session?.user || null;
    
    if (!currentUser) {
      // 1. No Session: Redirect to admin login
      router.push('/admin/login')
      setLoading(false)
      return;
    }

    // 2. Session Exists: Query the public.admin_users table to check for role
    try {
      // The SELECT query checks if an entry exists in the admin_users table for this user's ID.
      // This relies on the RLS policy created in SUPABASE_SETUP.sql allowing authenticated users 
      // to SELECT only their own entry.
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', currentUser.id)
        .maybeSingle() 

      const isAdmin = !!data;
      
      if (!isAdmin) {
        // 3a. Not Admin: Sign them out and redirect
        await supabase.auth.signOut() 
        alert("Access Denied. Only administrators can access this portal.")
        router.push('/') 
      } else {
        // 3b. Is Admin: Grant Access
        setUser(currentUser)
        setLoading(false)
      }

    } catch (error) {
      console.error('Error fetching admin role:', error);
      // Fallback to login in case of a serious DB connection error
      router.push('/admin/login')
      setLoading(false)
    }
  }


  useEffect(() => {
    let authSubscription = null;

    const setupAuth = async () => {
      // Initial session check
      const { data: { session } } = await supabase.auth.getSession();
      
      // Perform the access check
      await checkUser(session); 

      // Set up listener for real-time auth changes
      const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
        // On any auth state change, re-run the check logic
        if (session) {
            checkUser(session);
        } else {
            // No session in listener, redirect
            router.push('/admin/login');
        }
      })
      authSubscription = subscription;
    };

    setupAuth();

    return () => {
      if (authSubscription) {
        authSubscription.subscription.unsubscribe()
      }
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00629B]"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return children
}