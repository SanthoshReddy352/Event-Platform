'use client'

import { useState, useEffect } from 'react'
import GradientText from '@/components/GradientText'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function ContactPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    // Pre-fill form if user is logged in and is a participant
    if (user && !isAdmin) {
      const fetchProfile = async () => {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle()
        
        setFormData((prev) => ({
          ...prev,
          email: user.email || '',
          name: profile?.name || '',
        }))
      }
      fetchProfile()
    }
  }, [user, isAdmin])

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Your message has been sent successfully! We will get back to you soon.')
        // Reset message field, but keep pre-filled data
        setFormData((prev) => ({
          ...prev,
          message: '',
        }))
      } else {
        throw new Error(data.error || 'Failed to send message.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Determine if fields should be disabled
  const isUserParticipant = !authLoading && user && !isAdmin

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <GradientText>Contact Us</GradientText>
          </h1>
          <p className="text-gray-400">
            Have questions? Fill out the form below to get in touch with our team.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send Us a Message</CardTitle>
            <CardDescription>We'll do our best to respond within 24 hours.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {success && (
                <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded">
                  {success}
                </div>
              )}
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your Name"
                    required
                    disabled={isUserParticipant}
                    className={isUserParticipant ? 'cursor-not-allowed bg-gray-800/50' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    required
                    disabled={isUserParticipant}
                    className={isUserParticipant ? 'cursor-not-allowed bg-gray-800/50' : ''}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Your message or question..."
                  required
                  rows={6}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}