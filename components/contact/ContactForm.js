'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send, CheckCircle2 } from 'lucide-react'
import LastWordGradientText from '@/components/LastWordGradientText'

export default function ContactForm() {
  const storageKey = 'contactForm'
  const defaultState = { name: '', email: '', message: '' }
  
  // Initialize with false to prevent hydration mismatch
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState(defaultState)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Handle hydration and initial load
  useEffect(() => {
    setMounted(true)
    const saved = window.sessionStorage.getItem(storageKey)
    if (saved) {
      setFormData(JSON.parse(saved))
    }
  }, [])

  // Save to storage on change
  useEffect(() => {
    if (mounted) {
      window.sessionStorage.setItem(storageKey, JSON.stringify(formData))
    }
  }, [formData, mounted])

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
        setFormData(defaultState)
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(storageKey)
        }
      } else {
        throw new Error(data.error || 'An unknown error occurred')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Prevent hydration mismatch by rendering a placeholder or simpler version on first server pass
  // But for forms, usually it's better to just wait for mount if we heavily rely on client storage
  if (!mounted) {
    return (
     <Card className="w-full glass-card border-white/10 bg-white/5 backdrop-blur-md">
       <CardContent className="p-6 space-y-4">
         <div className="h-10 bg-gray-700/20 rounded animate-pulse" />
         <div className="h-10 bg-gray-700/20 rounded animate-pulse" />
         <div className="h-32 bg-gray-700/20 rounded animate-pulse" />
         <div className="h-10 bg-gray-700/20 rounded animate-pulse" />
       </CardContent>
     </Card>
    )
  }

  return (
    <Card className="w-full relative overflow-hidden bg-white/5 backdrop-blur-md border-white/10 shadow-2xl">
      <CardContent className="p-6 sm:p-8">
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-12 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-white">Message Sent!</h3>
              <p className="text-gray-300 max-w-xs">
                Thanks for reaching out. We'll be in touch with you shortly.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setSuccess(false)}
                className="mt-4 border-white/20 hover:bg-white/10"
              >
                Send another message
              </Button>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base text-gray-200">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  required
                  className="bg-white/5 border-white/10 focus:border-brand-primary/50 focus:ring-brand-primary/50 text-white placeholder:text-gray-500 transition-all duration-300"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base text-gray-200">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  required
                  className="bg-white/5 border-white/10 focus:border-brand-primary/50 focus:ring-brand-primary/50 text-white placeholder:text-gray-500 transition-all duration-300"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message" className="text-base text-gray-200">
                  Message
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="How can we help you?"
                  rows={5}
                  required
                  className="bg-white/5 border-white/10 focus:border-brand-primary/50 focus:ring-brand-primary/50 text-white placeholder:text-gray-500 resize-none transition-all duration-300"
                />
              </div>
              
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  {error}
                </motion.div>
              )}
              
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold py-6 shadow-lg shadow-blue-900/20 transition-all duration-300 transform hover:scale-[1.02]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Send className="mr-2 h-5 w-5" />
                )}
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
