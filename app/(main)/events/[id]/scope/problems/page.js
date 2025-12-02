'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, Loader2, Users, CheckCircle, XCircle, AlertTriangle, Lock, Search, Filter
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { isWithinInterval } from 'date-fns'
import { fetchWithTimeout } from '@/lib/utils'

export default function ProblemSelectionPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [problems, setProblems] = useState([])
  const [event, setEvent] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [selecting, setSelecting] = useState(false)
  const [error, setError] = useState(null)
  const [selectedProblemDetails, setSelectedProblemDetails] = useState(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  
  // Cache ref
  const cache = useRef({})

  const fetchData = useCallback(async () => {
    if (!user || !params.id) return

    // Check cache first
    if (cache.current[params.id]) {
        const cached = cache.current[params.id];
        if (Date.now() - cached.timestamp < 30000) {
            setEvent(cached.event);
            setParticipant(cached.participant);
            setProblems(cached.problems);
            setSelectedProblemDetails(cached.selectedProblemDetails);
            setLoading(false);
            return;
        }
    }
    
    try {
      setLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Please log in')

      // 1. Fetch Event Details
      const eventRes = await fetch(`/api/events/${params.id}?t=${Date.now()}`, { cache: 'no-store' })
      const eventData = await eventRes.json()
      
      if (!eventData.success) throw new Error('Event not found')

      // 2. Fetch Participant
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', params.id)
        .eq('user_id', user.id)
        .single()

      if (participantError && participantError.code !== 'PGRST116') throw participantError
      
      if (!participantData) {
         setError("You are not registered for this event.")
         return
      }

      // 3. Fetch Problems
      const { data: problemsData, error: problemsError } = await supabase
        .from('problem_statements')
        .select('*')
        .eq('event_id', params.id)
        .order('created_at', { ascending: true })

      if (problemsError) throw problemsError

      // 4. Calculate Selection Counts
      const { data: allParticipants } = await supabase
        .from('participants')
        .select('selected_problem_id')
        .eq('event_id', params.id)
        .not('selected_problem_id', 'is', null)

      const selectionCounts = {}
      if (allParticipants) {
        allParticipants.forEach(p => {
          selectionCounts[p.selected_problem_id] = (selectionCounts[p.selected_problem_id] || 0) + 1
        })
      }

      const problemsWithCounts = problemsData.map(p => ({
        ...p,
        current_selections: selectionCounts[p.id] || 0,
        is_full: (selectionCounts[p.id] || 0) >= p.max_selections
      }))

      let selectedDetails = null;
      if (participantData.selected_problem_id) {
        selectedDetails = problemsWithCounts.find(p => p.id === participantData.selected_problem_id)
      }

      setEvent(eventData.event)
      setParticipant(participantData)
      setProblems(problemsWithCounts)
      setSelectedProblemDetails(selectedDetails)

      cache.current[params.id] = {
          event: eventData.event,
          participant: participantData,
          problems: problemsWithCounts,
          selectedProblemDetails: selectedDetails,
          timestamp: Date.now()
      };

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id, params.id]) 

  useEffect(() => {
    if (!authLoading) fetchData()
  }, [authLoading, fetchData])

  // Realtime Listener
  useEffect(() => {
    if (!params.id) return
    const channel = supabase
      .channel(`problems_realtime:${params.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `event_id=eq.${params.id}` },
        (payload) => { fetchData() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [params.id, fetchData])

  const handleSelectProblem = async (problemId) => {
    if (!confirm('Are you sure? Once selected, you CANNOT change your problem statement. This decision is permanent.')) return

    setSelecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetchWithTimeout(`/api/events/${params.id}/select-problem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ problem_id: problemId }),
        timeout: 15000
      })

      const data = await response.json()

      if (data.success) {
        await fetchData()
        alert('Problem statement selected successfully! Your selection is now locked.')
        router.push(`/events/${params.id}/scope`)
      } else {
        alert(`Failed to select: ${data.error}`)
        fetchData() 
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-red mx-auto" />
          <p className="mt-4 text-gray-400">Loading challenges...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="border-red-500/50 bg-red-950/10 max-w-md w-full glass-card">
          <CardHeader>
            <CardTitle className="text-red-500">Access Denied</CardTitle>
            <CardDescription className="text-red-200/70">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/events/${params.id}`}>
              <Button variant="outline" className="w-full border-red-500/30 hover:bg-red-950/30 text-red-400">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const alreadySelected = !!participant?.selected_problem_id
  const selectionOpen = event?.problem_selection_start && event?.problem_selection_end
  ? isWithinInterval(new Date(), {
      start: new Date(event.problem_selection_start),
      end: new Date(event.problem_selection_end)
    })
  : false

  // Filter problems
  const filteredProblems = problems.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand-red/30">
      
      {/* --- HEADER --- */}
      <div className="bg-brand-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="container mx-auto px-4 py-12 relative z-10">
          <Link href={`/events/${params.id}/scope`}>
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 mb-6 -ml-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Problem Statements</h1>
          <p className="text-xl text-white/80">Choose your challenge wisely.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 -mt-8 relative z-20 space-y-6">
        
        {/* --- STATUS & FILTERS --- */}
        <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 sticky top-4 z-30 shadow-2xl backdrop-blur-xl bg-black/80 border-white/10">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input 
                        placeholder="Search problems..." 
                        className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-brand-orange/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                    <Filter className="h-4 w-4" />
                    <span>{filteredProblems.length} available</span>
                </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                {alreadySelected ? (
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/20 px-4 py-2">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Selection Locked
                    </Badge>
                ) : selectionOpen ? (
                    <Badge className="bg-brand-orange text-white px-4 py-2 animate-pulse">
                        Selection Open
                    </Badge>
                ) : (
                    <Badge variant="outline" className="text-gray-500 border-gray-700 px-4 py-2">
                        Selection Closed
                    </Badge>
                )}
            </div>
        </div>

        {/* --- GRID --- */}
        {filteredProblems.length === 0 ? (
          <div className="text-center py-20">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                <Search className="h-8 w-8 text-gray-500" />
             </div>
             <h3 className="text-xl font-semibold text-white mb-2">No problems found</h3>
             <p className="text-gray-400">Try adjusting your search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProblems.map((problem, index) => {
              const isSelected = problem.id === participant?.selected_problem_id
              const isFull = problem.is_full && !isSelected
              const canSelect = selectionOpen && !alreadySelected && !isFull

              return (
                <div 
                  key={problem.id} 
                  className={`
                    group relative flex flex-col
                    glass-card rounded-2xl p-6
                    transition-all duration-300
                    ${isSelected ? 'border-green-500/50 bg-green-500/5' : 'hover:border-brand-orange/30 hover:bg-white/5 hover:-translate-y-1'}
                    ${isFull ? 'opacity-60 grayscale-[0.5]' : ''}
                  `}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-white/60">
                        #{index + 1}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs font-medium bg-black/40 px-2 py-1 rounded-full border border-white/5">
                        <Users size={12} className={isFull ? 'text-red-400' : 'text-brand-orange'} />
                        <span className={isFull ? 'text-red-400' : 'text-gray-300'}>
                            {problem.current_selections}/{problem.max_selections}
                        </span>
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-brand-orange transition-colors">
                    {problem.title}
                  </h3>
                  <p className="text-gray-400 text-sm line-clamp-4 mb-6 flex-1">
                    {problem.description || 'No description provided.'}
                  </p>

                  {/* Footer / Action */}
                  <div className="mt-auto pt-4 border-t border-white/5">
                    {isSelected ? (
                        <div className="w-full py-3 rounded-xl bg-green-500/20 text-green-500 flex items-center justify-center font-semibold border border-green-500/20">
                            <CheckCircle className="mr-2 h-5 w-5" />
                            Selected
                        </div>
                    ) : isFull ? (
                        <div className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center font-semibold border border-red-500/10 cursor-not-allowed">
                            <Lock className="mr-2 h-5 w-5" />
                            Full
                        </div>
                    ) : canSelect ? (
                        <Button
                            onClick={() => handleSelectProblem(problem.id)}
                            disabled={selecting}
                            className="w-full bg-white text-black hover:bg-brand-gradient hover:text-white font-bold transition-all duration-300"
                        >
                            {selecting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                'Select Challenge'
                            )}
                        </Button>
                    ) : (
                        <Button disabled className="w-full bg-white/5 text-gray-500 border border-white/5">
                            Unavailable
                        </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}