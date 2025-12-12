'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Trash2, Plus, Save, ArrowLeft, Loader2, Pencil, CheckCircle,
  HelpCircle, Target, Lightbulb, Sparkles, Trophy, GripVertical
} from 'lucide-react'
import { toast } from 'sonner'
import LastWordGradientText from '@/components/LastWordGradientText'
import { useAuth } from '@/context/AuthContext'

// ============================================================================
// Stat Card Component
// ============================================================================
function StatCard({ title, value, icon: Icon, delay = 0, color = 'brand-red' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 100 }}
    >
      <Card className={`relative overflow-hidden border-${color}/20 bg-gradient-to-br from-background to-${color}/5 hover:shadow-lg hover:shadow-${color}/10 transition-all duration-300 group`}>
        <div className={`absolute top-0 right-0 w-16 h-16 bg-${color}/10 rounded-full blur-2xl group-hover:bg-${color}/20 transition-colors`} />
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`p-2 rounded-full bg-${color}/10`}>
            <Icon className={`h-5 w-5 text-${color}`} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold text-${color}`}>{value}</p>
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
    "Keep questions clear and concise",
    "Use 4 options for balanced difficulty",
    "Assign higher points to harder questions",
    "Test the quiz before publishing"
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="border-amber-500/20 bg-gradient-to-br from-background to-amber-500/5 h-full">
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
// Question Card Component
// ============================================================================
function QuestionCard({ question, index, onEdit, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="relative group bg-card/50 backdrop-blur-sm border-border/50 hover:border-brand-red/50 hover:shadow-lg hover:shadow-brand-red/5 transition-all duration-300">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-4">
            <div className="flex gap-3 flex-1">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="shrink-0"
              >
                <Badge 
                  variant="outline" 
                  className="h-8 w-8 rounded-full flex items-center justify-center p-0 bg-brand-gradient text-white border-0 font-bold"
                >
                  {index + 1}
                </Badge>
              </motion.div>
              <div className="flex-1">
                <CardTitle className="text-lg font-medium leading-tight mb-2 text-foreground">
                  {question.question_text}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs font-normal bg-brand-red/10 text-brand-red hover:bg-brand-red/20">
                    <Trophy className="h-3 w-3 mr-1" />
                    {question.points} {question.points === 1 ? 'Point' : 'Points'}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-normal">
                    {question.options.length} Options
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-brand-orange hover:text-brand-orange/80 hover:bg-brand-orange/10"
                  onClick={() => onEdit(question)}
                >
                  <Pencil size={16} />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                  onClick={() => onDelete(question.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </motion.div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {question.options.map((opt, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className={`flex items-center p-3 rounded-lg text-sm border transition-all ${
                  i === question.correct_option_index
                    ? "bg-green-500/10 border-green-500/30 text-green-500 font-medium shadow-sm shadow-green-500/10"
                    : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs mr-3 font-semibold transition-all ${
                  i === question.correct_option_index
                    ? "bg-green-500 text-white shadow-md"
                    : "bg-background border border-border text-muted-foreground"
                }`}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="flex-1">{opt}</span>
                {i === question.correct_option_index && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Empty State Component
// ============================================================================
function EmptyState({ onAdd }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20 bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl border-2 border-dashed border-muted-foreground/20"
    >
      <motion.div
        animate={{ 
          y: [0, -10, 0],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 3,
          repeat: Infinity,
          repeatType: 'loop'
        }}
        className="inline-block mb-4"
      >
        <HelpCircle className="h-16 w-16 text-muted-foreground/50" />
      </motion.div>
      <h3 className="text-xl font-semibold text-foreground mb-2">No Questions Yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Start building your quiz by adding your first question. Make it engaging!
      </p>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button 
          onClick={onAdd} 
          className="bg-brand-gradient text-white border-0 shadow-lg shadow-brand-red/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Your First Question
        </Button>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// Main Quiz Builder Client Component
// ============================================================================
export default function QuizBuilderClient({ initialEvent, initialQuestions }) {
  const { session } = useAuth()
  const router = useRouter()
  const eventId = initialEvent.id

  const [questions, setQuestions] = useState(initialQuestions || [])
  const [saving, setSaving] = useState(false)

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Form State
  const [formData, setFormData] = useState({
    question_text: '',
    options: ['', '', '', ''],
    correct_option_index: 0,
    points: 1,
  })

  // Draft persistence
  useEffect(() => {
    if (!editingId && isDialogOpen) {
      localStorage.setItem(`quiz_draft_${eventId}`, JSON.stringify(formData))
    }
  }, [formData, editingId, isDialogOpen, eventId])

  const handleOpenAdd = () => {
    setEditingId(null)
    const savedDraft = localStorage.getItem(`quiz_draft_${eventId}`)
    if (savedDraft) {
      try {
        setFormData(JSON.parse(savedDraft))
      } catch (e) {
        resetFormData()
      }
    } else {
      resetFormData()
    }
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (q) => {
    setEditingId(q.id)
    setFormData({
      question_text: q.question_text,
      options: [...q.options],
      correct_option_index: q.correct_option_index,
      points: q.points,
    })
    setIsDialogOpen(true)
  }

  const resetFormData = () => {
    setFormData({
      question_text: '',
      options: ['', '', '', ''],
      correct_option_index: 0,
      points: 1,
    })
  }

  const handleSave = async () => {
    if (!formData.question_text.trim()) {
      toast.error('Question text is required')
      return
    }
    if (formData.options.some((o) => !o.trim())) {
      toast.error('All options are required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        action: editingId ? 'update' : 'create',
        question: editingId ? { ...formData, id: editingId } : formData,
      }

      const res = await fetch(`/api/events/${eventId}/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.success) {
        if (editingId) {
          setQuestions(questions.map((q) => (q.id === editingId ? data.question : q)))
          toast.success('Question updated successfully!')
        } else {
          setQuestions([...questions, data.question])
          localStorage.removeItem(`quiz_draft_${eventId}`)
          toast.success('Question added successfully!')
        }
        setIsDialogOpen(false)
        resetFormData()
      } else {
        toast.error(data.error || 'Failed to save question')
      }
    } catch (error) {
      console.error('Error saving question:', error)
      toast.error('Failed to save question')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteQuestion = async (id) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      const res = await fetch(`/api/events/${eventId}/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'delete',
          question: { id },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setQuestions(questions.filter((q) => q.id !== id))
        toast.success('Question deleted')
      }
    } catch (error) {
      console.error('Error deleting question:', error)
      toast.error('Failed to delete question')
    }
  }

  // Calculate stats
  const totalQuestions = questions.length
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
      >
        <div className="flex items-center gap-4">
          <Link href={`/admin/events/${eventId}/dashboard`}>
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              <LastWordGradientText>Quiz Builder</LastWordGradientText>
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage questions for{' '}
              <span className="text-brand-red font-medium">{initialEvent.title}</span>
            </p>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={handleOpenAdd}
            className="bg-brand-gradient text-white border-0 shadow-lg shadow-brand-red/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </motion.div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Total Questions"
          value={totalQuestions}
          icon={HelpCircle}
          delay={0.1}
        />
        <StatCard
          title="Total Points"
          value={totalPoints}
          icon={Target}
          delay={0.2}
        />
        <TipsCard />
      </div>

      {/* Questions List */}
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
                  <Sparkles className="h-5 w-5 text-brand-red" />
                  Quiz Questions
                </CardTitle>
                <CardDescription>
                  Click to edit • Hover for actions
                </CardDescription>
              </div>
              {questions.length > 0 && (
                <Badge variant="outline" className="text-muted-foreground">
                  {questions.length} question{questions.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {questions.length === 0 ? (
              <EmptyState onAdd={handleOpenAdd} />
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                  {questions.map((q, idx) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      index={idx}
                      onEdit={handleOpenEdit}
                      onDelete={handleDeleteQuestion}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Add/Edit Question Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[720px] p-0 bg-transparent border-0 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
            className="relative bg-background/80 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Animated Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                animate={{
                  x: [0, 30, 0],
                  y: [0, -20, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br from-brand-red/20 to-brand-orange/20 blur-3xl"
              />
              <motion.div
                animate={{
                  x: [0, -20, 0],
                  y: [0, 30, 0],
                  scale: [1, 1.3, 1],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-gradient-to-br from-green-500/15 to-emerald-500/15 blur-3xl"
              />
            </div>

            {/* Header Section */}
            <div className="relative p-4 sm:p-6 pb-4 border-b border-border/30 bg-gradient-to-r from-brand-red/5 to-brand-orange/5">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ rotate: editingId ? [0, 10, -10, 0] : [0, 360] }}
                  transition={{ duration: editingId ? 0.5 : 2, repeat: editingId ? 0 : Infinity, ease: 'linear' }}
                  className="p-3 rounded-xl bg-brand-gradient shadow-lg shadow-brand-red/20"
                >
                  {editingId ? (
                    <Pencil className="h-6 w-6 text-white" />
                  ) : (
                    <Sparkles className="h-6 w-6 text-white" />
                  )}
                </motion.div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-brand-red to-brand-orange bg-clip-text text-transparent">
                    {editingId ? 'Edit Question' : 'Create New Question'}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground mt-1">
                    {editingId
                      ? 'Make changes to your question below and save.'
                      : 'Design an engaging question for your quiz.'}
                  </DialogDescription>
                </div>
              </div>
              
              {/* Progress Steps */}
              <div className="flex items-center justify-center gap-2 mt-6">
                {['Question', 'Options', 'Points'].map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="flex items-center gap-2"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                        i === 0 ? 'bg-brand-gradient text-white shadow-lg' : 'bg-muted text-muted-foreground'
                      }`}>
                        {i + 1}
                      </div>
                      <span className="text-sm text-muted-foreground hidden sm:inline">{step}</span>
                    </motion.div>
                    {i < 2 && (
                      <div className="w-8 h-0.5 bg-gradient-to-r from-muted to-muted/50 hidden sm:block" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Content */}
            <div className="relative p-4 sm:p-6 space-y-5 sm:space-y-6 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Question Text Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-brand-red/10">
                    <HelpCircle className="h-4 w-4 text-brand-red" />
                  </div>
                  <Label htmlFor="question" className="text-base font-semibold">
                    Question Text
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="question"
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    placeholder="e.g. What is the capital of France?"
                    className="h-12 bg-muted/30 border-border/50 focus:border-brand-red/50 focus-visible:ring-brand-red/20 transition-all text-base rounded-xl pl-4 pr-10"
                  />
                  {formData.question_text && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* Options Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-green-500/10">
                      <Target className="h-4 w-4 text-green-500" />
                    </div>
                    <Label className="text-base font-semibold">Answer Options</Label>
                  </div>
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Select correct answer
                  </Badge>
                </div>
                
                <div className="grid gap-3">
                  {formData.options.map((opt, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.08 }}
                      whileHover={{ scale: 1.01 }}
                      className={`relative flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        formData.correct_option_index === i
                          ? 'bg-green-500/10 border-green-500/50 shadow-lg shadow-green-500/10'
                          : 'bg-muted/20 border-border/50 hover:border-brand-red/30 hover:bg-muted/30'
                      }`}
                      onClick={() => setFormData({ ...formData, correct_option_index: i })}
                    >
                      {/* Option Letter Badge */}
                      <motion.div
                        animate={{
                          scale: formData.correct_option_index === i ? 1.1 : 1,
                          rotate: formData.correct_option_index === i ? [0, 10, -10, 0] : 0,
                        }}
                        transition={{ duration: 0.3 }}
                        className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-base sm:text-lg transition-all ${
                          formData.correct_option_index === i
                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/40'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </motion.div>
                      
                      {/* Option Input */}
                      <div className="flex-1 relative">
                        <Input
                          value={opt}
                          onChange={(e) => {
                            e.stopPropagation()
                            const newOptions = [...formData.options]
                            newOptions[i] = e.target.value
                            setFormData({ ...formData, options: newOptions })
                          }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder={`Enter option ${String.fromCharCode(65 + i)}...`}
                          className={`h-10 border-0 bg-transparent focus-visible:ring-0 text-base placeholder:text-muted-foreground/50 ${
                            formData.correct_option_index === i ? 'text-green-600 dark:text-green-400 font-medium' : ''
                          }`}
                        />
                      </div>
                      
                      {/* Correct Answer Indicator */}
                      <AnimatePresence>
                        {formData.correct_option_index === i && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0, rotate: -180 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0, rotate: 180 }}
                            className="shrink-0 p-2 rounded-full bg-green-500"
                          >
                            <CheckCircle className="h-4 w-4 text-white" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Points Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <Trophy className="h-4 w-4 text-amber-500" />
                  </div>
                  <Label className="text-base font-semibold">Point Value</Label>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  {[1, 2, 3, 5, 10].map((p, i) => (
                    <motion.button
                      key={p}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.45 + i * 0.05 }}
                      whileHover={{ scale: 1.08, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setFormData({ ...formData, points: p })}
                      className={`relative w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg transition-all duration-300 ${
                        formData.points === p
                          ? 'bg-brand-gradient text-white shadow-xl shadow-brand-red/30'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-border'
                      }`}
                    >
                      {formData.points === p && (
                        <motion.div
                          layoutId="pointsGlow"
                          className="absolute inset-0 rounded-xl bg-brand-gradient opacity-20 blur-xl"
                        />
                      )}
                      {p}
                    </motion.button>
                  ))}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                    className="relative"
                  >
                    <Input
                      type="number"
                      min="1"
                      className="w-20 h-14 text-center text-lg font-bold border-border/50 bg-muted/30 rounded-xl focus-visible:ring-brand-red/20"
                      value={formData.points}
                      onChange={(e) =>
                        setFormData({ ...formData, points: parseInt(e.target.value) || 1 })
                      }
                      placeholder="..."
                    />
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-background px-2 rounded">
                      Custom
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* Footer Actions */}
            <div className="relative p-4 sm:p-6 pt-4 border-t border-border/30 bg-gradient-to-r from-muted/20 to-muted/10 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-muted-foreground flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                Your draft is auto-saved
              </motion.p>
              
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-border/50 hover:bg-muted/50 rounded-xl h-10 sm:h-11 px-4 sm:px-6 flex-1 sm:flex-initial"
                  >
                    Cancel
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-brand-gradient text-white border-0 rounded-xl h-10 sm:h-11 px-4 sm:px-8 shadow-lg shadow-brand-red/20 font-semibold flex-1 sm:flex-initial"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        {editingId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                        {editingId ? 'Save Changes' : 'Create Question'}
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Auto-save indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 text-center"
      >
        <p className="text-xs text-muted-foreground">
          ✨ Your draft is auto-saved to your browser while adding a new question.
        </p>
      </motion.div>
    </div>
  )
}
