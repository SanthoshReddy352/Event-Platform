'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
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

  const handlePasswordUpdate = async (e) => {
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

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setSuccess(true)
      // Log user out after successful password update for security
      await supabase.auth.signOut() 

    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const renderContent = () => {
    if (loading) {
        return (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00629B]"></div>
              <p className="mt-4 text-gray-600">Checking link validity...</p>
            </div>
        )
    }
    
    if (success) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-green-600 mb-4">Success!</h2>
                <p className="text-gray-600 mb-6">Your password has been updated. You can now log in with your new password.</p>
                <Link href="/auth">
                    <Button className="bg-[#00629B] hover:bg-[#004d7a]">Go to Login</Button>
                </Link>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
                <p className="text-gray-600 mb-6">{error}</p>
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
                className="w-full bg-[#00629B] hover:bg-[#004d7a]"
                disabled={loading}
            >
                {loading ? 'Updating...' : 'Set New Password'}
            </Button>
        </form>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
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