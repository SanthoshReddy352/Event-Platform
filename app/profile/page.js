// app/profile/page.js
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { User, Phone, Mail } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext' // IMPORT useAuth

function ProfileContent() {
  const router = useRouter()
  // Get user from the GLOBAL context
  const { user, loading: authLoading } = useAuth() // MODIFIED: Get authLoading

  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profileData, setProfileData] = useState({
    name: '',
    phone_number: '',
    email: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // This function now just fetches profile data, not auth
  const fetchProfile = useCallback(async (currentUser) => {
    if (!currentUser) {
        setLoading(false); // No user, stop loading
        router.push('/auth');
        return;
    }
    
    setLoading(true)
    setError('')
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
          setLoading(false); // No session, stop loading
          router.push('/auth');
          return;
      }

      const response = await fetch('/api/profile', {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      const data = await response.json()
      
      if (data.success) {
        setProfileData({
            name: data.profile.name || '',
            phone_number: data.profile.phone_number || '',
            email: currentUser.email, // Get email from context user
        })
      } else {
        // Fallback
        setProfileData(prev => ({
            ...prev,
            email: currentUser.email,
        }))
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }, [router]) // fetchProfile is stable

  // --- START OF FIX ---
  // This useEffect now depends on user?.id and authLoading
  useEffect(() => {
    // Wait for the auth context to finish loading
    if (authLoading) {
      setLoading(true); // Show loader while auth is initializing
      return;
    }

    // Auth is loaded, now check if we have a user
    if (user) {
      fetchProfile(user)
    } else {
      // If user is null (and auth isn't loading), redirect
      setLoading(false);
      router.push('/auth')
    }
  // We depend on authLoading and the user's ID.
  // This will run once auth is done, and won't re-run on tab-focus
  // because user.id remains the same.
  }, [user?.id, authLoading, fetchProfile, router])
  // --- END OF FIX ---

  const handleUpdate = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
        setError("User session expired. Please log in again.")
        setIsSubmitting(false)
        router.push('/auth')
        return
    }

    try {
      const updatePayload = {
        name: profileData.name.trim(),
        phone_number: profileData.phone_number.trim(),
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`, // Pass token
        },
        body: JSON.stringify(updatePayload),
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess('Profile updated successfully!')
        // Re-fetch to ensure local state matches DB
        await fetchProfile(user) 
      } else {
        setError(data.error || 'Failed to update profile.')
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('An unexpected error occurred during update.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Use the loading state (which is now correctly synced with authLoading)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
          <p className="mt-4 text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }
  
  // If we are not loading AND the user is null, we are about to redirect
  // This prevents the form from briefly flashing
  if (!user) {
    return null; 
  }

  return (
    // ... (The rest of the JSX for this file is unchanged)
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">My Profile</h1>
          <p className="text-gray-400">Manage your basic participant information.</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Update your personal information below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-6">
              
              {/* Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {success}
                </div>
              )}
              
              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label>Email (Cannot be changed here)</Label>
                <div className="flex items-center space-x-2">
                  <Mail size={20} className="text-gray-500" />
                  <Input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="cursor-not-allowed bg-gray-50"
                  />
                </div>
              </div>
              
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="flex items-center space-x-2">
                    <User size={20} className="text-gray-500" />
                    <Input
                      id="name"
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      placeholder="Enter your full name"
                      required
                    />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <div className="flex items-center space-x-2">
                    <Phone size={20} className="text-gray-500" />
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone_number}
                      onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                      placeholder="+91 12345 67890"
                    />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#00629B] hover:bg-[#004d7a]"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </Button>
              
              <div className="pt-2 text-center">
                  <Link href="/">
                      <Button 
                        type="button"
                        variant="link" 
                        className="text-sm"
                      >
                          Go to Home
                      </Button>
                  </Link>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ProfilePage() {
    return <ProfileContent />
}