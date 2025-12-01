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
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'
import { Github } from 'lucide-react'
import LastWordGradientText from '@/components/LastWordGradientText'

function AuthPageWithSuspense() {
  const searchParams = useSearchParams()
  const redirectEventId = searchParams.get('redirect')
  const finalRedirect = redirectEventId ? `/events/${redirectEventId}` : '/events';

  return <ParticipantAuthPage finalRedirect={finalRedirect} />
}

function ParticipantAuthPage({ finalRedirect }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)

  // --- PERSISTENCE ---
  const LOGIN_KEY = 'auth_login_email';
  const SIGNUP_KEY = 'auth_signup_email';

  const [loginData, setLoginData] = useState(() => {
    if (typeof window !== 'undefined') {
        return { email: window.sessionStorage.getItem(LOGIN_KEY) || '', password: '' };
    }
    return { email: '', password: '' };
  })
  
  const [signupData, setSignupData] = useState(() => {
    if (typeof window !== 'undefined') {
        return { email: window.sessionStorage.getItem(SIGNUP_KEY) || '', password: '', confirmPassword: '' };
    }
    return { email: '', password: '', confirmPassword: '' };
  })

  // Save emails to storage
  useEffect(() => {
      if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(LOGIN_KEY, loginData.email);
      }
  }, [loginData.email]);

  useEffect(() => {
      if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(SIGNUP_KEY, signupData.email);
      }
  }, [signupData.email]);

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('') 
  const [currentTab, setCurrentTab] = useState('login')

  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        router.replace(finalRedirect)
      } else {
        setSessionLoading(false)
      }
    }
  }, [user?.id, authLoading, router, finalRedirect])

  const handleLogin = async (e) => {
    e.preventDefault() 
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      })

      if (loginError) throw loginError

      // Clear persistence on success
      if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(LOGIN_KEY);
      }

    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider) => {
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${finalRedirect}`,
        },
      })
      if (error) throw error
    } catch (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault() 
    setError('')
    setSuccess('')

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
      })

      if (signUpError) throw signUpError

      if (data.user && data.user.email_confirmed_at) {
          setError("A user with this email already exists. Please log in.")
          setLoading(false)
          return; 
      }

      setSuccess('Sign up successful! Please check your email to confirm your account.')
      
      // Clear persistence on success
      if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(SIGNUP_KEY);
      }
      setSignupData({ email: '', password: '', confirmPassword: '' })
      setCurrentTab('login'); 

    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault() 
    setIsResetting(true)
    setResetMessage('')
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: resetEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/events`, 
        },
      })

      if (otpError) throw otpError

      setResetMessage('Login link sent! Check your email to sign in instantly.')
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
            <LastWordGradientText>Participant Portal</LastWordGradientText>
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
                      Forgot Password / Login with Magic Link
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

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleOAuth('google')}
                      disabled={loading}
                    >
                      <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                      </svg>
                      Google
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleOAuth('github')}
                      disabled={loading}
                    >
                      <Github className="mr-2 h-4 w-4" />
                      GitHub
                    </Button>
                  </div>
                </div>
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

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleOAuth('google')}
                      disabled={loading}
                    >
                      <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                      </svg>
                      Google
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleOAuth('github')}
                      disabled={loading}
                    >
                      <Github className="mr-2 h-4 w-4" />
                      GitHub
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Instant Login Link</DialogTitle>
            <DialogDescription>
              Enter your email address. We will send you a secure link to log in instantly without a password.
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
                disabled={isResetting || resetMessage.includes('Login link sent')}
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
                disabled={isResetting || resetMessage.includes('Login link sent')}
              >
                {isResetting ? 'Sending...' : 'Send Magic Link'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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