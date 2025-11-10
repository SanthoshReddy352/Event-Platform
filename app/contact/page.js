// app/auth/page.js
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation' 
import { supabase } from '@/lib/supabase/client'
import GradientText from '@/components/GradientText'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog' 
import { useAuth } from '@/context/AuthContext' 

export default function ParticipantAuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams() 
  const redirectEventId = searchParams.get('redirect')
  const finalRedirect = redirectEventId ? `/events/${redirectEventId}` : '/events'; 

  const { user, loading: authLoading } = useAuth() 

  const [loading, setLoading] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true) 
  
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [signupData, setSignupData] = useState({ email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
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
    // (Unchanged)
  }

  const handleSignup = async (e) => {
    // (Unchanged)
  }
  
  const handleForgotPassword = async (e) => {
    // (Unchanged)
  }

  
  if (sessionLoading || authLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div> {/* CHANGED */}
              <p className="mt-4 text-gray-400">Checking session...</p> {/* CHANGED */}
            </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4"> {/* CHANGED */}
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* --- START OF THEME CHANGE --- */}
          <img src="/logo.jpg" alt="EventX Logo" className="w-48 mx-auto mb-4" /> {/* CHANGED */}
          <h1 className="text-3xl font-bold">
            <GradientText>Participant Portal</GradientText>
          </h1>
          <p className="text-gray-400 mt-2">Login or create an account to register for events</p> {/* CHANGED */}
          {/* --- END OF THEME CHANGE --- */}
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
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded"> {/* CHANGED */}
                      {error}
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
                            setIsForgotPasswordOpen(true)
                        }}
                    >
                        Forgot Password?
                    </Button>
                  </div>

                  {/* --- START OF THEME CHANGE --- */}
                  <Button
                    type="submit"
                    className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity" // CHANGED
                    disabled={loading}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </Button>
                  {/* --- END OF THEME CHANGE --- */}
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
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded"> {/* CHANGED */}
                      {error}
                    </div>
                  )}
                  {/* (Fields unchanged) */}
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
                  {/* --- START OF THEME CHANGE --- */}
                  <Button
                    type="submit"
                    className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity" // CHANGED
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Sign Up'}
                  </Button>
                  {/* --- END OF THEME CHANGE --- */}
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
                <div className={`px-4 py-3 rounded text-sm ${resetMessage.includes('Error') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}> {/* CHANGED */}
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
              {/* --- START OF THEME CHANGE --- */}
              <Button 
                type="submit" 
                className="bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity" // CHANGED
                disabled={isResetting || resetMessage.includes('Password reset link sent')}
              >
                {isResetting ? 'Sending...' : 'Send Reset Link'}
              </Button>
              {/* --- END OF THEME CHANGE --- */}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}