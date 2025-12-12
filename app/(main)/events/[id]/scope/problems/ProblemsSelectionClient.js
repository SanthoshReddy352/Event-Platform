'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, Loader2, Users, CheckCircle, Lock, Search, Filter, Sparkles,
  AlertTriangle, ChevronRight, X
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { fetchWithTimeout } from '@/lib/utils'

// ============================================================================
// Animation Variants
// ============================================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 }
  }
}

// ============================================================================
// Problem Card Component
// ============================================================================
function ProblemCard({ 
  problem, 
  index, 
  isSelected, 
  isFull, 
  canSelect,
  selecting,
  onSelect,
  onViewDetails
}) {
  return (
    <motion.div 
      variants={cardVariants}
      layout
      whileHover={!isFull && !isSelected ? { 
        y: -8, 
        scale: 1.02,
        transition: { duration: 0.2 } 
      } : {}}
      className={`
        group relative flex flex-col
        glass-card rounded-2xl p-6 border
        transition-all duration-300
        ${isSelected 
          ? 'border-green-500/50 bg-green-500/5 shadow-[0_0_30px_-5px_rgba(34,197,94,0.2)]' 
          : isFull 
            ? 'opacity-60 grayscale-[0.3] border-white/5' 
            : 'border-white/10 hover:border-brand-orange/40 hover:bg-white/5 hover:shadow-[0_0_40px_-10px_rgba(255,145,77,0.2)]'
        }
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <Badge variant="outline" className="bg-white/5 border-white/10 text-white/60 font-mono">
          #{String(index + 1).padStart(2, '0')}
        </Badge>
        <div className={`
          flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border
          ${isFull 
            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
            : 'bg-black/40 border-white/10 text-gray-300'
          }
        `}>
          <Users size={12} className={isFull ? 'text-red-400' : 'text-brand-orange'} />
          <span className={isFull ? 'text-red-400' : ''}>
            {problem.current_selections}/{problem.max_selections}
          </span>
        </div>
      </div>

      {/* Content */}
      <h3 className={`
        text-xl font-bold mb-3 transition-colors
        ${isSelected ? 'text-green-400' : 'text-white group-hover:text-brand-orange'}
      `}>
        {problem.title}
      </h3>
      <p className="text-gray-400 text-sm line-clamp-4 mb-6 flex-1">
        {problem.description || 'No description provided.'}
      </p>

      {/* Capacity Progress Bar */}
      <div className="mb-4">
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(problem.current_selections / problem.max_selections) * 100}%` }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className={`h-full rounded-full ${
              isFull ? 'bg-red-500' : problem.current_selections > problem.max_selections * 0.7 
                ? 'bg-yellow-500' 
                : 'bg-brand-orange'
            }`}
          />
        </div>
      </div>

      {/* Footer / Action */}
      <div className="pt-4 border-t border-white/5 flex gap-2">
         {/* View Details Button */}
         <Button
            variant="ghost"
            onClick={() => onViewDetails(problem)}
            className="flex-1 bg-white/5 text-white hover:bg-white/10 border border-white/5"
          >
            Read Full Problem
          </Button>

        {isSelected ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center font-semibold border border-green-500/20 text-sm"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Selected
          </motion.div>
        ) : isFull ? (
          <div className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center font-semibold border border-red-500/10 cursor-not-allowed text-sm">
            <Lock className="mr-2 h-4 w-4" />
            Full
          </div>
        ) : canSelect ? (
          <Button
            onClick={() => onSelect(problem.id)}
            disabled={selecting}
            className="flex-1 bg-white text-black hover:bg-brand-gradient hover:text-white font-bold transition-all duration-300"
          >
            {selecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Select
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <Button disabled className="flex-1 bg-white/5 text-gray-500 border border-white/5">
            Unavailable
          </Button>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Problem Details Modal
// ============================================================================
function ProblemDetailsModal({ isOpen, problem, onClose, onSelect, canSelect, selecting, isSelected, isFull }) {
  if (!isOpen || !problem) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-card max-w-3xl w-full max-h-[85vh] flex flex-col rounded-2xl border border-white/10 shadow-2xl relative"
        >
          {/* Close Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-white/50 hover:text-white hover:bg-white/10 z-10"
            onClick={onClose}
          >
            <X size={20} />
          </Button>

          {/* Header */}
          <div className="p-8 pb-4 border-b border-white/5 shrink-0">
             <div className="flex items-center gap-3 mb-4">
                 <Badge variant="outline" className="bg-white/5 border-white/10 text-brand-orange font-mono">
                   Problem Statement
                 </Badge>
                 <div className={`
                    flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border
                    ${isFull 
                        ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                        : 'bg-green-500/10 border-green-500/20 text-green-400'
                    }
                 `}>
                     <Users size={12} />
                     <span>{problem.current_selections}/{problem.max_selections} Teams</span>
                 </div>
             </div>
             
             <h2 className="text-3xl font-bold text-white mb-2">{problem.title}</h2>
          </div>

          {/* Scrollable Content */}
          <div className="p-8 pt-6 overflow-y-auto custom-scrollbar flex-1">
            <h3 className="text-lg font-semibold text-white/90 mb-3">Description</h3>
            <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed whitespace-pre-wrap">
              {problem.description || 'No description provided.'}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 bg-black/20 shrink-0 flex justify-end gap-3 rounded-b-2xl">
              <Button variant="ghost" className="text-white hover:bg-white/10" onClick={onClose}>
                Close
              </Button>
              
              {isSelected ? (
                   <Button disabled className="bg-green-500/20 text-green-500 border border-green-500/20">
                     <CheckCircle className="mr-2 h-4 w-4" />
                     Currently Selected
                   </Button>
              ) : isFull ? (
                  <Button disabled className="bg-red-500/10 text-red-400 border border-red-500/10">
                     <Lock className="mr-2 h-4 w-4" />
                     Full Capacity
                  </Button>
              ) : canSelect ? (
                  <Button 
                    className="bg-brand-gradient text-white font-bold hover:opacity-90 min-w-[160px]"
                    onClick={() => {
                        onSelect(problem.id)
                        onClose()
                    }}
                    disabled={selecting}
                  >
                     {selecting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Select Challenge
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                  </Button>
              ) : (
                 <Button disabled className="bg-white/5 text-gray-500 border border-white/5">
                    Selection Unavailable
                 </Button>
              )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// Confirmation Modal
// ============================================================================
function ConfirmationModal({ isOpen, problem, onConfirm, onCancel, loading }) {
  if (!isOpen || !problem) return null

  return (
    <AnimatePresence>
      <motion.div

        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-card max-w-lg w-full p-8 rounded-2xl border border-brand-orange/30 shadow-[0_0_60px_-10px_rgba(255,145,77,0.3)]"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-brand-orange/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-brand-orange" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Confirm Selection</h2>
            <p className="text-gray-400">
              Once selected, you <span className="text-red-400 font-semibold">CANNOT</span> change your problem statement. This decision is permanent.
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Selected Problem</p>
            <h3 className="text-lg font-bold text-white">{problem.title}</h3>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 border-white/10 hover:bg-white/5 text-white"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-brand-gradient text-white font-bold hover:opacity-90"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirm Selection'
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// Main ProblemsSelectionClient Component
// ============================================================================
export default function ProblemsSelectionClient({ 
  initialEvent,
  initialProblems,
  initialParticipant,
  selectionOpen
}) {
  const router = useRouter()
  const { session } = useAuth()
  
  const [problems, setProblems] = useState(initialProblems)
  const [participant, setParticipant] = useState(initialParticipant)
  const [searchTerm, setSearchTerm] = useState('')
  const [selecting, setSelecting] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ open: false, problem: null })
  const [detailsModal, setDetailsModal] = useState({ open: false, problem: null })

  const alreadySelected = !!participant?.selected_problem_id

  // Filter problems based on search
  const filteredProblems = problems.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectProblem = (problemId) => {
    const problem = problems.find(p => p.id === problemId)
    setConfirmModal({ open: true, problem })
  }

  const handleViewDetails = (problem) => {
      setDetailsModal({ open: true, problem })
  }

  const confirmSelection = async () => {
    if (!confirmModal.problem) return

    setSelecting(true)
    try {
      const response = await fetchWithTimeout(`/api/events/${initialEvent.id}/select-problem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ problem_id: confirmModal.problem.id }),
        timeout: 15000
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        setParticipant(prev => ({ ...prev, selected_problem_id: confirmModal.problem.id }))
        setConfirmModal({ open: false, problem: null })
        
        // Redirect after short delay for visual feedback
        setTimeout(() => {
          router.push(`/events/${initialEvent.id}/scope`)
        }, 500)
      } else {
        alert(`Failed to select: ${data.error}`)
        // Refresh data to get latest selection counts
        router.refresh()
      }
    } catch (err) {
      console.error('Selection error:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setSelecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand-red/30">
      
      {/* --- HEADER --- */}
      <div className="bg-brand-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
        
        {/* Decorative Elements */}
        <div className="absolute top-10 right-20 w-64 h-64 bg-brand-orange/30 rounded-full blur-[100px]" />
        
        <div className="container mx-auto px-4 py-12 relative z-10">
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
              <Sparkles className="mr-1.5 h-3 w-3" />
              Problem Selection
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Problem Statements</h1>
            <p className="text-xl text-white/80">Choose your challenge wisely. Your selection is permanent.</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 -mt-8 relative z-20 space-y-6">
        
        {/* --- STATUS & FILTERS --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 sticky top-4 z-30 shadow-2xl backdrop-blur-xl bg-black/80 border border-white/10"
        >
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search problems..." 
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-brand-orange/50 h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
              <Filter className="h-4 w-4" />
              <span>{filteredProblems.length} problems</span>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            {alreadySelected ? (
              <Badge className="bg-green-500/20 text-green-500 border-green-500/20 px-4 py-2">
                <CheckCircle className="h-4 w-4 mr-2" />
                Selection Locked
              </Badge>
            ) : selectionOpen ? (
              <Badge className="bg-brand-orange text-white px-4 py-2 animate-pulse border-brand-orange">
                <Sparkles className="h-4 w-4 mr-2" />
                Selection Open
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500 border-gray-700 px-4 py-2">
                <Lock className="h-4 w-4 mr-2" />
                Selection Closed
              </Badge>
            )}
          </div>
        </motion.div>

        {/* --- GRID --- */}
        {filteredProblems.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-4">
              <Search className="h-10 w-10 text-gray-500" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">No problems found</h3>
            <p className="text-gray-400">Try adjusting your search terms.</p>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {filteredProblems.map((problem, index) => {
                const isSelected = problem.id === participant?.selected_problem_id
                const isFull = problem.is_full && !isSelected
                const canSelect = selectionOpen && !alreadySelected && !isFull

                return (
                  <ProblemCard
                    key={problem.id}
                    problem={problem}
                    index={index}
                    isSelected={isSelected}
                    isFull={isFull}
                    canSelect={canSelect}
                    selecting={selecting && confirmModal.problem?.id === problem.id}
                    onSelect={handleSelectProblem}
                    onViewDetails={handleViewDetails}
                  />
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Details Modal */}
      <ProblemDetailsModal 
         isOpen={detailsModal.open}
         problem={detailsModal.problem}
         onClose={() => setDetailsModal({ open: false, problem: null })}
         onSelect={handleSelectProblem}
         canSelect={selectionOpen && !alreadySelected && (!detailsModal.problem?.is_full || detailsModal.problem.id === participant?.selected_problem_id)}
         isFull={detailsModal.problem?.is_full && detailsModal.problem.id !== participant?.selected_problem_id}
         isSelected={detailsModal.problem?.id === participant?.selected_problem_id}
         selecting={selecting}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.open}
        problem={confirmModal.problem}
        onConfirm={confirmSelection}
        onCancel={() => setConfirmModal({ open: false, problem: null })}
        loading={selecting}
      />
    </div>
  )
}
