'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation' 
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LockKeyhole, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('verifying') // 'verifying', 'ready', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    // Listen for the specific PASSWORD_RECOVERY event
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready')
        setLoading(false)
      } else if (event === 'SIGNED_IN') {
        // FIX: Only reset to 'ready' if we are NOT already in 'success' state.
        // This prevents the listener from overwriting the success message 
        // when the session refreshes after a password update.
        if (status !== 'success') {
          setStatus('ready')
          setLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        // If they aren't signed in, the link might be invalid or expired
        setLoading(false)
        if (status !== 'success') {
            setStatus('error')
            setErrorMessage('Invalid or expired reset link. Please request a new one.')
        }
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [status])

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const { error } = await supabase.auth.updateUser({ password: password })
      
      if (error) throw error

      setStatus('success')
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/auth')
      }, 3000)

    } catch (error) {
      setErrorMessage(error.message)
      setStatus('ready') // Allow them to try again
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
          <p className="text-gray-400 animate-pulse">Verifying security token...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <div className="w-full max-w-md">
        <Card className="border-gray-800 shadow-xl">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red">
                {status === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
              </div>
            </div>
            <CardTitle className="text-2xl text-center">
              {status === 'success' ? 'Password Updated' : 'Reset Password'}
            </CardTitle>
            <CardDescription className="text-center">
              {status === 'success' 
                ? 'Your password has been changed successfully.' 
                : 'Enter your new password below.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'error' ? (
               <div className="text-center space-y-4">
                 <Alert variant="destructive">
                   <AlertCircle className="h-4 w-4" />
                   <AlertTitle>Error</AlertTitle>
                   <AlertDescription>{errorMessage}</AlertDescription>
                 </Alert>
                 <Link href="/auth">
                    <Button variant="outline" className="mt-4">Back to Login</Button>
                 </Link>
               </div>
            ) : status === 'success' ? (
                <div className="space-y-4">
                    <Alert className="bg-green-900/20 border-green-900 text-green-300">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>You can now log in with your new password.</AlertDescription>
                    </Alert>
                    <Link href="/auth" className="block">
                        <Button className="w-full bg-brand-gradient">Go to Login</Button>
                    </Link>
                </div>
            ) : (
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                {errorMessage && (
                    <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                )}
                <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                        id="new-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                </div>
                <Button
                    type="submit"
                    className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Updating Password...' : 'Reset Password'}
                </Button>
                </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}