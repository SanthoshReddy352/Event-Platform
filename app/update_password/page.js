'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation' 
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LockKeyhole, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('verifying') 
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    // 1. Manually handle the session check on mount
    const checkSession = async () => {
      try {
        // Attempt to get the existing session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (session) {
          setStatus('ready')
          setLoading(false)
          return
        }

        // 2. If no session, check for a 'code' in URL (PKCE flow) and exchange it manually
        // This fixes the issue where the library might miss the event
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (!exchangeError && data.session) {
            setStatus('ready')
          } else {
            setStatus('error')
            setErrorMessage('Invalid or expired reset link.')
          }
        } else {
            // Check for hash fragment (Implicit flow)
            const hash = window.location.hash
            if (hash && hash.includes('access_token')) {
                setStatus('ready')
            } else {
                setStatus('error')
                setErrorMessage('No authorization token found. Please use the link from your email.')
            }
        }
      } catch (err) {
        console.error(err)
        setStatus('error')
        setErrorMessage('An unexpected error occurred.')
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

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
      
      // Auto-redirect attempt
      setTimeout(() => {
        window.location.href = '/events'
      }, 2000)

    } catch (error) {
      setErrorMessage(error.message)
      setStatus('ready') 
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
          <p className="text-gray-400">Verifying security token...</p>
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
                <div className="space-y-6">
                    <Alert className="bg-green-900/20 border-green-900 text-green-300">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>Your password has been updated.</AlertDescription>
                    </Alert>
                    
                    {/* FAILSAFE BUTTON: If redirect fails, user can click this */}
                    <Button 
                        onClick={() => window.location.href = '/events'}
                        className="w-full bg-brand-gradient h-12 text-lg"
                    >
                        Continue to Events <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
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