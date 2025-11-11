'use client'

import { useState, useEffect } from 'react'
// We are not using useRouter, we will use window.location
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true) // For initial link check
  const [isSubmitting, setIsSubmitting] = useState(false) // For form submission
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check for the session created by the password reset token
    const checkSession = async () => {
      setLoading(true)
      
      // Add a small delay to allow Supabase redirect and session creation via hash/query params to settle
      await new Promise(resolve => setTimeout(resolve, 200)); 
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUser(user)
        setError('')
      } else {
        // This is the common error path if the token is invalid or expired
        setError("Invalid or expired reset link. Please ensure you are using the latest link sent to your email.")
      }
      setLoading(false)
    }

    checkSession()
  }, [])

  // --- START OF THE DEFINITIVE FIX ---
  const handlePasswordUpdate = (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true) 

    // We do NOT await this. We use .then() to avoid the race condition
    // with the onAuthStateChange listener.
    supabase.auth.updateUser({ password: password })
      .then(response => {
        const { error } = response;
        if (error) {
          throw error; // Go to catch block
        }
        
        // Success! The 200 OK was received.
        // Now we force a redirect to the home page.
        window.location.href = '/';
      })
      .catch(error => {
        // Handle any errors from the API call
        setError(error.message)
        setIsSubmitting(false) // Reset the button ONLY if an error occurs
      });
  }
  // --- END OF THE DEFINITIVE FIX ---

  const renderContent = () => {
    // This state is *only* for the initial link check
    if (loading) {
        return (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
              <p className="mt-4 text-gray-400">Checking link validity...</p>
            </div>
        )
    }
    
    if (error) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
                <p className="text-gray-400 mb-6">{error}</p>
                <p className="text-sm text-gray-500 mb-4">If the link is recent, try resetting your password again from the login page.</p>
                <Link href="/auth">
                    <Button variant="outline">Back to Login</Button>
                </Link>
            </div>
        )
    }
    
    // Show password form only if a user session is detected
    return (
        <form onSubmit={handlePasswordUpdate} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </div>
            <Button
                type="submit"
                className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
                disabled={isSubmitting} // Disable button based on isSubmitting
            >
                {isSubmitting ? 'Updating...' : 'Set New Password'} {/* Show correct text */}
            </Button>
        </form>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Update Your Password</CardTitle>
            <CardDescription>
              {user ? `Setting new password for ${user.email}` : 'Please enter and confirm your new password.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}