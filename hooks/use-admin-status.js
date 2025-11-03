// hooks/use-admin-status.js
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    let authSubscription = null;

    const checkAdmin = async (session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (!currentUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Query the public.admin_users table to check for role
        const { data } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', currentUser.id)
          .maybeSingle(); 

        const isUserAdmin = !!data;
        setIsAdmin(isUserAdmin);

      } catch (error) {
        // Log the error but fail safely (i.e., user is not considered an admin)
        console.error('Error fetching admin role:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    const setupAuthListener = async () => {
        // Initial session check
        const { data: { session } } = await supabase.auth.getSession();
        await checkAdmin(session); // Use await to ensure initial check completes

        // Set up listener for real-time auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            await checkAdmin(session);
        })
        
        if (subscription) {
            authSubscription = subscription.subscription;
        }
    };

    setupAuthListener();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [])

  return { isAdmin, loading, user };
}