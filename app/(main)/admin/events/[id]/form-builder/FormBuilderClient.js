'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import FormBuilder from '@/components/FormBuilder'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, Loader2, Save, Sparkles, 
  FileEdit, CheckCircle, Lightbulb
} from 'lucide-react'
import { toast } from 'sonner'
import LastWordGradientText from '@/components/LastWordGradientText'
import { fetchWithTimeout } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

// ============================================================================
// Stat Card Component
// ============================================================================
function StatCard({ title, value, icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 100 }}
    >
      <Card className="relative overflow-hidden border-brand-red/20 bg-gradient-to-br from-background to-brand-red/5 hover:shadow-lg hover:shadow-brand-red/10 transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-16 h-16 bg-brand-red/10 rounded-full blur-2xl group-hover:bg-brand-red/20 transition-colors" />
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-full bg-brand-red/10">
            <Icon className="h-5 w-5 text-brand-red" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-brand-red">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Tips Card Component
// ============================================================================
function TipsCard() {
  const tips = [
    "Use short, clear labels for your form fields",
    "Mark only essential fields as required",
    "Use dropdowns for fields with limited options",
    "Add placeholder text to guide users"
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="border-amber-500/20 bg-gradient-to-br from-background to-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-500">
            <Lightbulb size={16} />
            Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <motion.li 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <span className="text-amber-500 mt-1">•</span>
                {tip}
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Main Form Builder Client Component
// ============================================================================
export default function FormBuilderClient({ initialEvent }) {
  const { session } = useAuth()
  const router = useRouter()
  const id = initialEvent.id
  
  const storageKey = `formBuilderFields-${id}`
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Initialize fields from server data or session storage
  const [fields, setFields] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedSessionData = window.sessionStorage.getItem(storageKey)
      const parsedSessionData = savedSessionData ? JSON.parse(savedSessionData) : null
      if (parsedSessionData && parsedSessionData.length > 0) {
        return parsedSessionData
      }
    }
    return initialEvent.form_fields || []
  })

  // Auto-save to Session Storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(storageKey, JSON.stringify(fields))
    }
  }, [fields, storageKey])

  // Save to Database
  const handleSave = async () => {
    const invalidFields = fields.filter(f => !f.label || f.label.trim() === '')
    if (invalidFields.length > 0) {
      toast.error("Some fields are missing labels. Please fill them in before saving.")
      return
    }

    setIsSaving(true)
    setSaveSuccess(false)
    try {
      if (!session) throw new Error('Not authenticated')

      const response = await fetchWithTimeout(`/api/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ form_fields: fields }),
        timeout: 15000
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Form saved successfully!')
        setSaveSuccess(true)
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(storageKey)
        }
        setTimeout(() => setSaveSuccess(false), 2000)
        router.refresh()
      } else {
        throw new Error(data.error || 'Failed to save form')
      }
    } catch (err) {
      console.error('Save error:', err)
      if (err.name === 'AbortError') {
        toast.error("Save timed out. Please try again.")
      } else {
        toast.error(`Error: ${err.message}`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Count field types
  const requiredCount = fields.filter(f => f.required).length
  const totalCount = fields.length

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
      >
        <div className="flex items-center gap-4">
          <Link href={`/admin/events/${id}/dashboard`}>
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              <LastWordGradientText>Registration Form Builder</LastWordGradientText>
            </h1>
            <p className="text-muted-foreground mt-1">
              Customize the registration form for{' '}
              <span className="text-brand-red font-medium">{initialEvent.title}</span>
            </p>
          </div>
        </div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className={`min-w-[160px] font-semibold transition-all duration-300 ${
              saveSuccess 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-brand-gradient hover:opacity-90'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>

      {/* Stats and Tips Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard 
          title="Total Fields" 
          value={totalCount} 
          icon={FileEdit} 
          delay={0.1} 
        />
        <StatCard 
          title="Required Fields" 
          value={requiredCount} 
          icon={Sparkles} 
          delay={0.2} 
        />
        <TipsCard />
      </div>

      {/* Form Builder Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileEdit className="h-5 w-5 text-brand-red" />
                  Form Fields
                </CardTitle>
                <CardDescription>
                  Drag to reorder • Click to edit • Add new fields below
                </CardDescription>
              </div>
              {fields.length > 0 && (
                <Badge variant="outline" className="text-muted-foreground">
                  {fields.length} field{fields.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <FormBuilder fields={fields} setFields={setFields} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Auto-save indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 text-center"
      >
        <p className="text-xs text-muted-foreground">
          ✨ Your changes are auto-saved to your browser. Click "Save Changes" to sync with the server.
        </p>
      </motion.div>
    </div>
  )
}
