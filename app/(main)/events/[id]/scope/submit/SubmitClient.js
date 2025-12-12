'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import DynamicForm from '@/components/DynamicForm'
import { 
  ArrowLeft, Loader2, CheckCircle, XCircle, AlertTriangle, FileText, 
  Calendar, Info, Sparkles, Trophy, Clock, Send
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { format } from 'date-fns'

// ============================================================================
// Animation Variants
// ============================================================================
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5, type: "spring", stiffness: 200 }
  }
}

// ============================================================================
// Success State Component
// ============================================================================
function SubmissionSuccess({ eventTitle, eventId }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-green-500/5 blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[150px]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="glass-card max-w-2xl w-full p-12 rounded-3xl text-center relative z-10 border border-green-500/30 shadow-[0_0_80px_-20px_rgba(34,197,94,0.3)]"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="h-12 w-12 text-green-500" />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold text-white mb-4"
        >
          Submission Received!
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xl text-gray-300 mb-8"
        >
          Your project has been successfully submitted to{' '}
          <span className="text-brand-orange font-semibold">{eventTitle}</span>.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 rounded-xl p-6 mb-8 text-left border border-white/10"
        >
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-brand-orange" />
            Next Steps
          </h3>
          <ul className="space-y-3 text-gray-300">
            {[
              'Wait for the judges to review your submission.',
              'Keep an eye on your email for any announcements.',
              'Prepare for the final presentation if shortlisted.'
            ].map((step, i) => (
              <motion.li 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-start gap-3"
              >
                <span className="text-green-500 mt-0.5">✓</span>
                {step}
              </motion.li>
            ))}
          </ul>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <Link href={`/events/${eventId}/scope`}>
            <Button className="bg-white text-black hover:bg-gray-200 font-bold px-8 py-6 text-lg rounded-xl shadow-lg">
              Return to Dashboard
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}

// ============================================================================
// Guideline Step Component
// ============================================================================
function GuidelineStep({ number, title, description, variant = 'default' }) {
  const colors = {
    default: 'bg-brand-orange/20 text-brand-orange border-brand-orange/30',
    warning: 'bg-red-500/20 text-red-500 border-red-500/30'
  }

  return (
    <motion.li variants={fadeInUp} className="flex gap-4">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border ${colors[variant]}`}>
        {number}
      </div>
      <div>
        <p className="text-white font-medium">{title}</p>
        <p className="text-sm text-gray-400 mt-0.5">{description}</p>
      </div>
    </motion.li>
  )
}

// ============================================================================
// Main SubmitClient Component
// ============================================================================
export default function SubmitClient({ 
  initialEvent,
  submissionOpen,
  hasSubmitted: initialHasSubmitted,
  submissionFormFields
}) {
  const router = useRouter()
  const { session } = useAuth()
  
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(initialHasSubmitted)

  // Form draft persistence
  const storageKey = `hackathonSubmission-${initialEvent.id}`
  const [formData, setFormData] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.sessionStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : {}
    }
    return {}
  })

  const setAndStoreFormData = (newData) => {
    setFormData(newData)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(storageKey, JSON.stringify(newData))
    }
  }

  const handleSubmit = async (submissionData) => {
    if (submitted) {
      alert("You have already submitted your project.")
      return
    }

    if (!confirm('Are you sure you want to submit? You can only submit once.')) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/events/${initialEvent.id}/submit-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ submission_data: submissionData })
      })

      const data = await response.json()

      if (data.success) {
        setSubmitted(true)
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(storageKey)
        }
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        alert(`Submission failed: ${data.error}`)
      }
    } catch (err) {
      console.error('Submission error:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Show success state
  if (submitted) {
    return <SubmissionSuccess eventTitle={initialEvent.title} eventId={initialEvent.id} />
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand-red/30">
      {/* Header */}
      <div className="bg-brand-gradient h-72 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
        
        {/* Decorative Elements */}
        <div className="absolute top-10 right-10 w-80 h-80 bg-brand-orange/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-20 w-60 h-60 bg-brand-red/20 rounded-full blur-[100px]" />
        
        <div className="container mx-auto px-4 py-8 relative z-10">
          <Link href={`/events/${initialEvent.id}/scope`}>
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 mb-6 -ml-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md">
              <Send className="mr-1.5 h-3 w-3" />
              Final Submission
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Submit Your Project</h1>
            <p className="text-xl text-white/80">Showcase your hard work. Make it count.</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-20 pb-12">
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          
          {/* LEFT COL: Context */}
          <motion.div variants={fadeInUp} className="lg:col-span-1 space-y-6">
            {/* Status Card */}
            <div className="glass-card p-6 rounded-2xl border border-white/10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Info className="text-brand-orange" size={20} />
                Submission Status
              </h3>
              
              {!submissionOpen ? (
                <motion.div 
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400"
                >
                  <XCircle size={24} />
                  <div>
                    <p className="font-semibold">Window Closed</p>
                    <p className="text-xs opacity-80">Submissions are not currently accepted.</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3 text-green-400"
                >
                  <CheckCircle size={24} />
                  <div>
                    <p className="font-semibold">Window Open</p>
                    <p className="text-xs opacity-80">You can submit your project now.</p>
                  </div>
                </motion.div>
              )}

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Opens
                  </span>
                  <span className="font-mono text-white">
                    {initialEvent.submission_start ? format(new Date(initialEvent.submission_start), 'MMM d, HH:mm') : 'TBA'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Closes
                  </span>
                  <span className="font-mono text-brand-orange font-semibold">
                    {initialEvent.submission_end ? format(new Date(initialEvent.submission_end), 'MMM d, HH:mm') : 'TBA'}
                  </span>
                </div>
              </div>
            </div>

            {/* Guidelines */}
            <motion.div 
              variants={fadeInUp}
              className="glass-card p-6 rounded-2xl relative overflow-hidden border border-white/10"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <FileText size={80} />
              </div>
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <FileText className="text-brand-orange" size={20} />
                Submission Guidelines
              </h3>
              <motion.ul 
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-5"
              >
                <GuidelineStep 
                  number="1"
                  title="Fill Accurately"
                  description="Double-check all fields before submitting."
                />
                <GuidelineStep 
                  number="2"
                  title="Public Links"
                  description="Ensure demo video and repo are publicly accessible."
                />
                <GuidelineStep 
                  number="3"
                  title="One Chance"
                  description="You can only submit ONCE. No edits after."
                  variant="warning"
                />
              </motion.ul>
            </motion.div>
          </motion.div>

          {/* RIGHT COL: Form */}
          <motion.div variants={fadeInUp} className="lg:col-span-2">
            <div className="glass-card p-8 rounded-2xl border-t-4 border-t-brand-orange border border-white/10 shadow-[0_0_60px_-20px_rgba(255,145,77,0.2)]">
              {!submissionOpen ? (
                <div className="text-center py-16">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <AlertTriangle className="h-10 w-10 text-gray-500" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-gray-400 mb-2">Submission Locked</h2>
                  <p className="text-gray-500">Please wait for the submission window to open.</p>
                </div>
              ) : submissionFormFields.length === 0 ? (
                <div className="text-center py-16">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <FileText className="h-10 w-10 text-gray-500" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-gray-400 mb-2">No Form Configured</h2>
                  <p className="text-gray-500">The organizers haven't set up the submission form yet.</p>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                      <Sparkles className="text-brand-orange h-6 w-6" />
                      Project Details
                    </h2>
                    <p className="text-gray-400">Provide all necessary information for the judges to evaluate your project.</p>
                  </div>
                  
                  <div className="submission-form-wrapper">
                    <DynamicForm
                      fields={submissionFormFields}
                      onSubmit={handleSubmit}
                      eventId={initialEvent.id}
                      formData={formData}
                      onFormChange={setAndStoreFormData}
                      submitLabel={submitting ? "Submitting..." : "Submit Project"}
                      className="space-y-6"
                    />
                  </div>
                </>
              )}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  )
}
