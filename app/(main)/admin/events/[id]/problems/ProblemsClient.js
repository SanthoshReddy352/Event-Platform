'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, Plus, Trash2, Users, Loader2, 
  Target, Lightbulb, Sparkles, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import LastWordGradientText from '@/components/LastWordGradientText'
import { useAuth } from '@/context/AuthContext'
import { fetchWithTimeout } from '@/lib/utils'

// ============================================================================
// Animated Stat Card Component
// ============================================================================
function StatCard({ title, value, icon: Icon, delay = 0, color = 'brand-red' }) {
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
            <motion.p 
              className="text-2xl font-bold text-brand-red"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.2, type: 'spring', stiffness: 200 }}
            >
              {value}
            </motion.p>
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
    "Keep problem titles concise but descriptive",
    "Add detailed descriptions to help teams understand scope",
    "Set realistic team limits based on expected participation",
    "Update problems before registration closes"
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="h-full border-amber-500/20 bg-gradient-to-br from-background to-amber-500/5">
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
// Problem Card Component
// ============================================================================
function ProblemCard({ problem, onDelete, index }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure? This cannot be undone.')) return
    setIsDeleting(true)
    await onDelete(problem.id)
    setIsDeleting(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 100 }}
      whileHover={{ y: -2 }}
    >
      <Card className="group relative overflow-hidden border-brand-red/10 hover:border-brand-red/30 bg-gradient-to-br from-background to-brand-red/5 transition-all duration-300 hover:shadow-lg hover:shadow-brand-red/5">
        {/* Decorative gradient orb */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-brand-red/5 rounded-full blur-2xl group-hover:bg-brand-red/10 transition-colors" />
        
        <CardHeader className="pb-2 relative">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-red/10">
                <Target className="h-4 w-4 text-brand-red" />
              </div>
              <CardTitle className="text-lg font-bold">{problem.title}</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-red-600 hover:bg-red-100/50 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-all duration-200"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 relative">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
            {problem.description || 'No description provided.'}
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-medium text-brand-red border-brand-red/30 bg-brand-red/5">
              <Users className="h-3 w-3 mr-1" />
              Max Teams: {problem.max_selections}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Empty State Component
// ============================================================================
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-dashed border-brand-red/30 bg-gradient-to-br from-brand-red/5 to-transparent">
        <CardContent className="py-16">
          <div className="text-center space-y-4">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                repeatDelay: 3 
              }}
              className="inline-block"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-red/10 flex items-center justify-center">
                <Target className="w-8 h-8 text-brand-red" />
              </div>
            </motion.div>
            <div>
              <h3 className="text-lg font-semibold">No Problem Statements Yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first challenge to get teams excited!
              </p>
            </div>
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowLeft className="h-5 w-5 mx-auto text-brand-red -rotate-90" />
            </motion.div>
            <p className="text-xs text-muted-foreground">
              Use the form on the left to add problems
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Add Problem Form Component
// ============================================================================
function AddProblemForm({ eventId, onSuccess }) {
  const { session } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newProblem, setNewProblem] = useState({
    title: '',
    description: '',
    max_selections: 1
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newProblem.title) return

    try {
      setIsSubmitting(true)

      const response = await fetchWithTimeout(`/api/events/${eventId}/problems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          title: newProblem.title,
          description: newProblem.description,
          max_selections: parseInt(newProblem.max_selections)
        }),
        timeout: 15000
      })

      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      toast.success('Problem statement added!')
      setNewProblem({ title: '', description: '', max_selections: 1 })
      onSuccess()

    } catch (error) {
      console.error('Error adding problem:', error)
      toast.error('Failed to add problem statement')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="h-fit border-brand-red/20 shadow-lg bg-gradient-to-br from-background via-background to-brand-red/5 backdrop-blur-sm">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand-red/10">
              <Plus className="h-5 w-5 text-brand-red" />
            </div>
            <div>
              <CardTitle className="text-lg">Add New Problem</CardTitle>
              <CardDescription>Define a challenge for participants</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-1">
                Problem Title
                <span className="text-brand-red">*</span>
              </Label>
              <Input 
                id="title"
                placeholder="e.g., AI for Healthcare"
                value={newProblem.title}
                onChange={(e) => setNewProblem({...newProblem, title: e.target.value})}
                className="border-muted-foreground/20 focus:border-brand-red/50 transition-colors"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea 
                id="desc"
                placeholder="Detailed explanation of the problem, expected outcomes, and any constraints..."
                rows={4}
                value={newProblem.description}
                onChange={(e) => setNewProblem({...newProblem, description: e.target.value})}
                className="border-muted-foreground/20 focus:border-brand-red/50 transition-colors resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit" className="flex items-center gap-1">
                Selection Limit
                <span className="text-brand-red">*</span>
              </Label>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input 
                  id="limit"
                  type="number"
                  min="1"
                  value={newProblem.max_selections}
                  onChange={(e) => setNewProblem({...newProblem, max_selections: e.target.value})}
                  className="flex-1 border-muted-foreground/20 focus:border-brand-red/50 transition-colors"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Maximum teams that can choose this problem
              </p>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                type="submit" 
                className="w-full bg-brand-gradient font-semibold hover:opacity-90 transition-opacity" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Add Problem Statement
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Main Client Component
// ============================================================================
export default function ProblemsClient({ initialEvent, initialProblems }) {
  const { session } = useAuth()
  const router = useRouter()
  const [problems, setProblems] = useState(initialProblems)

  // Calculate stats
  const totalProblems = problems.length
  const totalTeamSlots = problems.reduce((sum, p) => sum + (p.max_selections || 0), 0)

  const handleDelete = async (problemId) => {
    try {
      const response = await fetchWithTimeout(`/api/events/${initialEvent.id}/problems/${problemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        timeout: 15000
      })

      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      toast.success('Problem statement deleted')
      setProblems(prev => prev.filter(p => p.id !== problemId))

    } catch (error) {
      console.error('Error deleting problem:', error)
      toast.error('Failed to delete')
    }
  }

  const handleAddSuccess = () => {
    router.refresh()
    // Also optimistically update from server
    setTimeout(() => {
      router.refresh()
    }, 500)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
      >
        <div className="flex items-center gap-4">
          <Link href={`/admin/events/${initialEvent.id}/dashboard`}>
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              <LastWordGradientText>Problem Statements</LastWordGradientText>
            </h1>
            <p className="text-muted-foreground mt-1">
              Define challenges for{' '}
              <span className="text-brand-red font-medium">{initialEvent.title}</span>
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-sm px-3 py-1">
          <Target className="h-3 w-3 mr-1" />
          {totalProblems} Problem{totalProblems !== 1 ? 's' : ''}
        </Badge>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard 
          title="Total Problems" 
          value={totalProblems} 
          icon={Target} 
          delay={0.1} 
        />
        <StatCard 
          title="Total Team Slots" 
          value={totalTeamSlots} 
          icon={Users} 
          delay={0.2} 
        />
        <TipsCard />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Add Form */}
        <div className="lg:col-span-1">
          <AddProblemForm 
            eventId={initialEvent.id} 
            onSuccess={handleAddSuccess} 
          />
        </div>

        {/* Right Column: Problem List */}
        <div className="lg:col-span-2 space-y-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Existing Statements
            </h2>
          </motion.div>

          {problems.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {problems.map((problem, index) => (
                  <ProblemCard 
                    key={problem.id} 
                    problem={problem} 
                    onDelete={handleDelete}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Footer tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        <p className="text-xs text-muted-foreground">
          💡 Tip: Problems are displayed to participants during the problem selection phase of your hackathon.
        </p>
      </motion.div>
    </div>
  )
}
