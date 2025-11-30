'use client'

import { useState, useEffect } from 'react' // --- DATA PERSISTENCE ---
import GradientText from '@/components/GradientText'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send } from 'lucide-react'
import LastWordGradientText from '@/components/LastWordGradientText'

export default function ContactPage() {
  
  // --- START OF DATA PERSISTENCE ---
  const storageKey = 'contactForm';
  const defaultState = { name: '', email: '', message: '' };
  
  const [formData, setFormData] = useState(() => {
    if (typeof window === 'undefined') return defaultState;
    const saved = window.sessionStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : defaultState;
  });
  // --- END OF DATA PERSISTENCE ---
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // --- START OF DATA PERSISTENCE ---
  // Save form data to session storage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(storageKey, JSON.stringify(formData));
    }
  }, [formData]);
  // --- END OF DATA PERSISTENCE ---

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSuccess(true)
        // --- START OF DATA PERSISTENCE ---
        setFormData(defaultState); // Clear form state
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(storageKey); // Clear storage
        }
        // --- END OF DATA PERSISTENCE ---
      } else {
        throw new Error(data.error || 'An unknown error occurred')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <h1 className="text-4xl font-bold text-center mb-4">
        <LastWordGradientText >Contact Us</LastWordGradientText>
      </h1>
      <p className="text-gray-400 text-center mb-8">
        Have a question or feedback? Let us know!
      </p>

      <Card>
        <CardHeader>
          <CardTitle><LastWordGradientText>Send us a Message</LastWordGradientText></CardTitle>
          <CardDescription>
            We'll get back to you as soon as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center py-8">
              <Send size={48} className="mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
              <p className="text-gray-400">
                Thanks for reaching out. We'll be in touch.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name"><LastWordGradientText>Name</LastWordGradientText></Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email"><LastWordGradientText>Email</LastWordGradientText></Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message"><LastWordGradientText>Message</LastWordGradientText></Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Your message..."
                  rows={6}
                  required
                />
              </div>
              
              {error && (
                <p className="text-red-500 text-sm">{`Error: ${error}`}</p>
              )}
              
              <Button
                type="submit"
                className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}