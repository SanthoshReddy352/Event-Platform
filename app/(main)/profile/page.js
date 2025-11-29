'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { Loader2, ShieldCheck, KeyRound } from 'lucide-react' // Added Icons

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // --- PASSWORD UPDATE STATE ---
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' })
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' })
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false)

  // --- START OF DATA PERSISTENCE ---
  const storageKey = 'userProfileForm';
  const defaultState = { name: '', phone_number: '', email: '' };

  const [profile, setProfile] = useState(() => {
    if (typeof window === 'undefined') return defaultState;
    const saved = window.sessionStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : defaultState;
  });
  // --- END OF DATA PERSISTENCE ---

  const fetchProfile = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        // --- START OF DATA PERSISTENCE ---
        const savedData = window.sessionStorage.getItem(storageKey);
        if (!savedData) {
          setProfile({
            name: data.profile.name || '',
            phone_number: data.profile.phone_number || '',
            email: data.profile.email || '',
          });
        }
        // --- END OF DATA PERSISTENCE ---
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error fetching profile:', error.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // --- START OF DATA PERSISTENCE ---
  useEffect(() => {
    if (typeof window !== 'undefined' && !loading) {
      window.sessionStorage.setItem(storageKey, JSON.stringify(profile));
    }
  }, [profile, loading]);
  // --- END OF DATA PERSISTENCE ---

  const handleChange = (e) => {
    const { name, value } = e.target
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // --- PASSWORD HANDLERS ---
  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordStatus({ type: '', message: '' })

    if (passwordData.newPassword.length < 6) {
        setPasswordStatus({ type: 'error', message: 'Password must be at least 6 characters.' })
        return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordStatus({ type: 'error', message: 'Passwords do not match.' })
        return
    }

    setIsPasswordSubmitting(true)
    try {
        const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword })
        if (error) throw error

        setPasswordStatus({ type: 'success', message: 'Password updated successfully!' })
        setPasswordData({ newPassword: '', confirmPassword: '' }) // Clear fields
    } catch (error) {
        setPasswordStatus({ type: 'error', message: error.message })
    } finally {
        setIsPasswordSubmitting(false)
    }
  }
  // -------------------------

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
        
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: profile.name,
          phone_number: profile.phone_number
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('Profile updated successfully!')
        
        // --- START OF DATA PERSISTENCE ---
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(storageKey);
        }
        // --- END OF DATA PERSISTENCE ---

      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert(`Update failed: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-red" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg space-y-8">
      {/* 1. Profile Details Card */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Your Profile</CardTitle>
            <CardDescription>Manage your account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="text-gray-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={profile.name}
                onChange={handleChange}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                name="phone_number"
                value={profile.phone_number}
                onChange={handleChange}
                placeholder="+91 12345 67890"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* 2. Security / Password Update Card */}
      <Card className="border-t-4 border-t-brand-red/20">
        <CardHeader>
            <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-red" />
                <CardTitle className="text-xl">Account Security</CardTitle>
            </div>
            <CardDescription>Update your password to keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {passwordStatus.message && (
                    <div className={`p-3 rounded text-sm ${passwordStatus.type === 'error' ? 'bg-red-900/20 text-red-300 border border-red-900' : 'bg-green-900/20 text-green-300 border border-green-900'}`}>
                        {passwordStatus.message}
                    </div>
                )}
                
                <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            placeholder="••••••••"
                            className="pl-9"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            placeholder="••••••••"
                            className="pl-9"
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    variant="outline"
                    className="w-full border-brand-red/50 hover:bg-brand-red/10 text-brand-red hover:text-brand-red"
                    disabled={isPasswordSubmitting}
                >
                    {isPasswordSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isPasswordSubmitting ? 'Updating Password...' : 'Update Password'}
                </Button>
            </form>
        </CardContent>
      </Card>
    </div>
  )
}