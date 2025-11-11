// app/auth/page.js

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import GradientText from '@/components/GradientText'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'

// This component handles the ?redirect= search param
function AuthPageWithSuspense() {
  const searchParams = useSearchParams()
  const redirectEventId = searchParams.get('redirect')
  // If a redirect URL is provided, use it. Otherwise, default to /events.
  const finalRedirect = redirectEventId ? `/events/${redirectEventId}` : '/events';

  return <ParticipantAuthPage finalRedirect={finalRedirect} />
}

function ParticipantAuthPage({ finalRedirect }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)

  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [signupData, setSignupData] = useState({ email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('') // For success messages
  const [currentTab, setCurrentTab] = useState('login')

  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  // This useEffect redirects the user if they are already logged in
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        router.replace(finalRedirect)
      } else {
        setSessionLoading(false)
      }
    }
  // Depend on the primitive user?.id
  }, [user?.id, authLoading, router, finalRedirect])

  const handleLogin = async (e) => {
    e.preventDefault() // This prevents the page from reloading
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      })

      if (loginError) throw loginError

      // On success, the useEffect above will detect the 'user' change and redirect
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- START OF FIX: Modified handleSignup ---
  const handleSignup = async (e) => {
    e.preventDefault() // This prevents the page from reloading
    setError('')
    setSuccess('')

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      // Get both data and error from the signUp call
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
      })

      if (signUpError) throw signUpError

      // NEW CHECK: Check if the user exists AND is already confirmed.
      // data.user.email_confirmed_at will be null for new or unconfirmed users.
      // It will have a timestamp for existing, confirmed users.
      if (data.user && data.user.email_confirmed_at) {
          setError("A user with this email already exists. Please log in.")
          setLoading(false)
          return; // Stop execution
      }

      // Show success message (for new users or unconfirmed users re-triggering email)
      setSuccess('Sign up successful! Please check your email to confirm your account.')
      setSignupData({ email: '', password: '', confirmPassword: '' })
      setCurrentTab('login'); // Switch to login tab

    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }
  // --- END OF FIX ---

  const handleForgotPassword = async (e) => {
    e.preventDefault() // This prevents the page from reloading
    setIsResetting(true)
    setResetMessage('')
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/update_password`, // Full URL for the reset link
      })

      if (resetError) throw resetError

      setResetMessage('Password reset link sent! Please check your email.')
    } catch (error) {
      setResetMessage(`Error: ${error.message}`)
    } finally {
      setIsResetting(false)
    }
  }

  if (sessionLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
          <p className="mt-4 text-gray-400">Checking session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="EventX Logo" className="w-48 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">
            <GradientText>Participant Portal</GradientText>
          </h1>
          <p className="text-gray-400 mt-2">Login or create an account to register for events</p>
        </div>

        <Tabs defaultValue="login" className="w-full" value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Sign in to access event registration</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded">
                      {success}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      placeholder="participant@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>

                  <div className="text-right">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-sm"
                      onClick={() => {
                        setError('')
                        setSuccess('')
                        setIsForgotPasswordOpen(true)
                      }}
                    >
                      Forgot Password?
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
                    disabled={loading}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Create a new participant account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded">
                      {success}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      placeholder="participant@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      placeholder="Must be at least 6 characters"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Sign Up'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter the email address associated with your account. We will send a password reset link to that email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            {resetMessage && (
              <div className={`px-4 py-3 rounded text-sm ${resetMessage.includes('Error') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
                {resetMessage}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="participant@example.com"
                required
                disabled={isResetting || resetMessage.includes('Password reset link sent')}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsForgotPasswordOpen(false)}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
                disabled={isResetting || resetMessage.includes('Password reset link sent')}
              >
                {isResetting ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// We wrap the default export in Suspense to allow useSearchParams()
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
        </div>
      </div>
    }>
      <AuthPageWithSuspense />
    </Suspense>
  )
}