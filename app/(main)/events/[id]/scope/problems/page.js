'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, Loader2, Users, CheckCircle, XCircle, AlertTriangle, Lock
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { isWithinInterval } from 'date-fns' // Added import for time checking

export default function ProblemSelectionPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [problems, setProblems] = useState([])
  const [event, setEvent] = useState(null) // Added event state
  const [scopeStatus, setScopeStatus] = useState(null)
  const [selecting, setSelecting] = useState(false)
  const [error, setError] = useState(null)
  const [selectedProblemDetails, setSelectedProblemDetails] = useState(null)
  
  // Track previous status to detect changes and show notifications
  const prevStatusRef = useRef(null)

  const fetchData = useCallback(async () => {
    if (!user || !params.id) return
    
    try {
      // Only show loading spinner on initial load
      if (!scopeStatus) setLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Please log in')
      }

      // 1. Fetch event details (Added to get start/end times)
      const eventRes = await fetch(`/api/events/${params.id}?t=${Date.now()}`, {
        cache: 'no-store'
      })
      const eventData = await eventRes.json()
      
      if (!eventData.success) {
        throw new Error('Event not found')
      }
      setEvent(eventData.event)

      // 2. Fetch scope status with cache-busting
      const scopeRes = await fetch(`/api/events/${params.id}/scope-status?t=${Date.now()}`, {
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      })
      
      const scopeData = await scopeRes.json()
      
      if (!scopeData.success) {
        setError(scopeData.error || 'Access denied')
        return
      }
      
      // Detect status changes and notify user (non-disruptive)
      if (prevStatusRef.current && scopeData.phases) {
        const prev = prevStatusRef.current.phases
        const curr = scopeData.phases
        
        // Notify when problem selection window opens
        if (!prev.problem_selection && curr.problem_selection) {
          toast.success('Problem selection window is now open!', {
            description: 'You can now select your problem statement.',
            duration: 5000
          })
        }
        
        // Notify when problem selection window closes
        if (prev.problem_selection && !curr.problem_selection) {
          toast.warning('Problem selection window has closed.', {
            duration: 5000
          })
        }
      }
      
      prevStatusRef.current = scopeData
      setScopeStatus(scopeData)

      // 3. Fetch problem statements
      const { data: problemsData, error: problemsError } = await supabase
        .from('problem_statements')
        .select('*')
        .eq('event_id', params.id)
        .order('created_at', { ascending: true })

      if (problemsError) throw problemsError

      // 4. Fetch current selection counts
      const { data: participants } = await supabase
        .from('participants')
        .select('selected_problem_id')
        .eq('event_id', params.id)
        .not('selected_problem_id', 'is', null)

      // Count selections per problem
      const selectionCounts = {}
      if (participants) {
        participants.forEach(p => {
          selectionCounts[p.selected_problem_id] = (selectionCounts[p.selected_problem_id] || 0) + 1
        })
      }

      // Add count to each problem
      const problemsWithCounts = problemsData.map(p => ({
        ...p,
        current_selections: selectionCounts[p.id] || 0,
        is_full: (selectionCounts[p.id] || 0) >= p.max_selections
      }))

      setProblems(problemsWithCounts)

      // If user has already selected, fetch details
      // FIXED: Added optional chaining to prevent crash
      if (scopeData.participant?.selected_problem_id) {
        const selected = problemsWithCounts.find(p => p.id === scopeData.participant.selected_problem_id)
        setSelectedProblemDetails(selected)
      }

    } catch (err) {
      console.error('Error fetching data:', err)
      // Only set error on initial load
      if (!scopeStatus) setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id, params.id]) 

  useEffect(() => {
    if (!authLoading) {
      fetchData()
      
      // Silent background polling every 30 seconds
      const intervalId = setInterval(fetchData, 30000)
      
      return () => clearInterval(intervalId)
    }
  }, [authLoading, fetchData])

  const handleSelectProblem = async (problemId) => {
    if (!confirm('Are you sure? Once selected, you CANNOT change your problem statement. This decision is permanent.')) {
      return
    }

    setSelecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/events/${params.id}/select-problem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ problem_id: problemId })
      })

      const data = await response.json()

      if (data.success) {
        alert('Problem statement selected successfully! Your selection is now locked.')
        router.push(`/events/${params.id}/scope`)
      } else {
        alert(`Failed to select: ${data.error}`)
        fetchData() // Refresh to show updated counts
      }
    } catch (err) {
      console.error('Selection error:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setSelecting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-red mx-auto" />
          <p className="mt-4 text-gray-400">Loading problem statements...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Access Denied</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/events/${params.id}/scope`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Scope
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // FIXED: Optional chaining and local time calculation
  const alreadySelected = scopeStatus?.participant?.selected_problem_id
  
  const selectionOpen = event?.problem_selection_start && event?.problem_selection_end
  ? isWithinInterval(new Date(), {
      start: new Date(event.problem_selection_start),
      end: new Date(event.problem_selection_end)
    })
  : scopeStatus?.phases?.problem_selection

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-brand-gradient py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <Link href={`/events/${params.id}/scope`}>
            <Button variant="ghost" className="text-white hover:bg-white/10 mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Scope
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Problem Statements</h1>
          <p className="text-white/80">Choose your challenge</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        
        {/* Status Banner */}
        {alreadySelected ? (
          <Card className="border-green-500 bg-green-500/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-500/20 p-3 rounded-full">
                  <Lock className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-500 mb-1">Problem Statement Locked</h3>
                  <p className="text-sm text-gray-400">
                    You have already selected your problem statement. Your selection is permanent and cannot be changed.
                  </p>
                  {selectedProblemDetails && (
                    <p className="text-sm text-gray-300 mt-2">
                      <span className="font-semibold">Selected:</span> {selectedProblemDetails.title}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !selectionOpen ? (
          <Card className="border-orange-500 bg-orange-500/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="bg-orange-500/20 p-3 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-500 mb-1">Selection Window Closed</h3>
                  <p className="text-sm text-gray-400">
                    The problem selection window is currently closed. You can only view the available problems.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-blue-500 bg-blue-500/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500/20 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-500 mb-1">Selection Window Open</h3>
                  <p className="text-sm text-gray-400">
                    Choose wisely! Once you select a problem, your choice is <span className="font-semibold text-white">permanent and cannot be changed</span>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-400">
            <p>• Review all problem statements carefully before making your selection</p>
            <p>• Each problem has a maximum number of participants that can select it</p>
            <p>• Once you select a problem, your choice is <span className="text-brand-red font-semibold">PERMANENT</span> and cannot be reverted</p>
            <p>• If a problem reaches its maximum limit, it will be locked for further selections</p>
          </CardContent>
        </Card>

        {/* Problem Statements List */}
        {problems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              <p>No problem statements have been added yet. Please check back later.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Available Problem Statements ({problems.length})</h2>
            
            {problems.map((problem, index) => {
              // FIXED: Optional chaining here as well
              const isSelected = problem.id === scopeStatus?.participant?.selected_problem_id
              const isFull = problem.is_full && !isSelected
              const canSelect = selectionOpen && !alreadySelected && !isFull

              return (
                <Card 
                  key={problem.id} 
                  className={`
                    ${isSelected ? 'border-green-500 bg-green-500/5' : ''}
                    ${isFull ? 'opacity-60' : ''}
                    hover:border-brand-red/50 transition-colors
                  `}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                          {isSelected && (
                            <Badge className="bg-green-500 text-white">Your Selection</Badge>
                          )}
                          {isFull && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <Lock size={12} /> Full
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl">{problem.title}</CardTitle>
                      </div>
                      
                      {/* Selection Indicator */}
                      <div className="text-center min-w-[100px]">
                        <div className="flex items-center justify-center gap-2 text-sm mb-1">
                          <Users size={16} className={problem.is_full ? 'text-red-500' : 'text-gray-400'} />
                          <span className={`font-semibold ${problem.is_full ? 'text-red-500' : ''}`}>
                            {problem.current_selections} / {problem.max_selections}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">Participants</p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-400 mb-2">Description</h4>
                      <p className="text-gray-300 whitespace-pre-wrap">
                        {problem.description || 'No description provided.'}
                      </p>
                    </div>

                    {canSelect && (
                      <Button
                        onClick={() => handleSelectProblem(problem.id)}
                        disabled={selecting}
                        className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90"
                      >
                        {selecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Selecting...
                          </>
                        ) : (
                          'Select This Problem'
                        )}
                      </Button>
                    )}

                    {isSelected && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-500">
                          <CheckCircle size={20} />
                          <span className="font-semibold">You have selected this problem</span>
                        </div>
                      </div>
                    )}

                    {isFull && !isSelected && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-red-500">
                          <XCircle size={20} />
                          <span className="font-semibold">This problem has reached its participant limit</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}