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
  Target, Lightbulb, Sparkles, AlertCircle, Eye, Pencil
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
// ============================================================================
// View Problem Modal
// ============================================================================
function ViewProblemModal({ problem, isOpen, onClose }) {
  if (!problem) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-black/95 border-brand-red/20 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-brand-red" />
            {problem.title}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-brand-red border-brand-red/30 bg-brand-red/5">
              <Users className="h-3 w-3 mr-1" />
              Max Teams: {problem.max_selections}
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-brand-red/20 hover:[&::-webkit-scrollbar-thumb]:bg-brand-red/40 [&::-webkit-scrollbar-thumb]:rounded-full mt-4">
          <div className="space-y-4 text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {problem.description}
          </div>
        </div>

        <DialogFooter className="mt-6 border-t border-border/50 pt-4">
            <Button onClick={onClose} variant="ghost">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Edit Problem Modal
// ============================================================================
function EditProblemModal({ problem, isOpen, onClose, onUpdate, eventId }) {
  const { session } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: problem?.title || '',
    description: problem?.description || '',
    max_selections: problem?.max_selections || 1
  })

  // Update form data when problem changes
  if (problem && formData.title !== problem.title && !isSubmitting) {
      // This logic is slightly flawed for edits in progress if parent re-renders, 
      // but fine for a simple modal that mounts/unmounts or relies on key.
      // Better to use useEffect in a real component, or keying the modal.
  }
  
  // Use a key on the component instance in parent to reset state, 
  // or useEffect here. Let's use useEffect for safety.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [localProblemId, setLocalProblemId] = useState(problem?.id)
  
  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (problem?.id !== localProblemId) {
      setFormData({
        title: problem?.title || '',
        description: problem?.description || '',
        max_selections: problem?.max_selections || 1
      })
      setLocalProblemId(problem?.id)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title) return

    try {
      setIsSubmitting(true)
      const response = await fetchWithTimeout(`/api/events/${eventId}/problems/${problem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      toast.success('Problem statement updated!')
      onUpdate(data.data) // Pass back the updated problem
      onClose()
    } catch (error) {
      console.error('Error updating problem:', error)
      toast.error('Failed to update problem')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-black/95 border-brand-red/20">
        <DialogHeader>
          <DialogTitle>Edit Problem Statement</DialogTitle>
          <DialogDescription>Make changes to the problem details below.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Problem Title <span className="text-brand-red">*</span></Label>
              <Input 
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="border-muted-foreground/20 focus:border-brand-red/50"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea 
                id="edit-desc"
                rows={8}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="border-muted-foreground/20 focus:border-brand-red/50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-brand-red/20 hover:[&::-webkit-scrollbar-thumb]:bg-brand-red/40 [&::-webkit-scrollbar-thumb]:rounded-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-limit">Selection Limit <span className="text-brand-red">*</span></Label>
              <Input 
                id="edit-limit"
                type="number"
                min="1"
                value={formData.max_selections}
                onChange={(e) => setFormData({...formData, max_selections: e.target.value})}
                className="border-muted-foreground/20 focus:border-brand-red/50"
                required
              />
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" className="bg-brand-gradient" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Save Changes'}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Problem Card Component
// ============================================================================
function ProblemCard({ problem, onDelete, onEdit, onView, index }) {

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
                className="text-muted-foreground hover:text-brand-red hover:bg-brand-red/10"
                onClick={() => onView(problem)}
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                onClick={() => onEdit(problem)}
                title="Edit Problem"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-red-600 hover:bg-red-100/50"
                onClick={handleDelete}
                disabled={isDeleting}
                title="Delete Problem"
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
                className="border-muted-foreground/20 focus:border-brand-red/50 transition-colors h-12 text-base"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea 
                id="desc"
                placeholder="Detailed explanation of the problem, expected outcomes, and any constraints..."
                rows={10}
                value={newProblem.description}
                onChange={(e) => setNewProblem({...newProblem, description: e.target.value})}
                className="border-muted-foreground/20 focus:border-brand-red/50 transition-colors text-base [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-brand-red/20 hover:[&::-webkit-scrollbar-thumb]:bg-brand-red/40 [&::-webkit-scrollbar-thumb]:rounded-full"
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
  /* State for Modals */
  const [editingProblem, setEditingProblem] = useState(null)
  const [viewingProblem, setViewingProblem] = useState(null)
  const [problems, setProblems] = useState(initialProblems)

  /* Update problem in list after edit */
  const handleUpdateSuccess = (updatedProblem) => {
    setProblems(prev => prev.map(p => p.id === updatedProblem.id ? updatedProblem : p))
  }

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
                    onEdit={setEditingProblem}
                    onView={setViewingProblem}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <EditProblemModal 
        isOpen={!!editingProblem}
        onClose={() => setEditingProblem(null)}
        problem={editingProblem}
        eventId={initialEvent.id}
        onUpdate={handleUpdateSuccess}
      />
      
      <ViewProblemModal
        isOpen={!!viewingProblem}
        onClose={() => setViewingProblem(null)}
        problem={viewingProblem}
      />

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
