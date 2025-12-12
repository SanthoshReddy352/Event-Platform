'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Plus, Trash2, Users, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner' // Assuming you have sonner or use-toast, if not change to alert

import { useAuth } from '@/context/AuthContext'
import { fetchWithTimeout } from '@/lib/utils'

export default function ProblemStatementsPage() {
  const { session } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [problems, setProblems] = useState([])
  const [eventTitle, setEventTitle] = useState('')
  
  // Form State
  const [newProblem, setNewProblem] = useState({
    title: '',
    description: '',
    max_selections: 1 // Default limit
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      // Get Event Title for UI
      const { data: eventData } = await supabase
        .from('events')
        .select('title')
        .eq('id', params.id)
        .single()
      
      if (eventData) setEventTitle(eventData.title)

      // Get Problem Statements
      const { data: problemData, error } = await supabase
        .from('problem_statements')
        .select('*')
        .eq('event_id', params.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setProblems(problemData || [])

    } catch (error) {
      console.error('Error fetching problems:', error)
      toast.error('Failed to load problem statements')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (params.id) fetchData()
  }, [fetchData, params.id])

  // 2. Handle Add
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newProblem.title) return

    try {
      setIsSubmitting(true)

      // [FIX] Use API to avoid session hang
      const response = await fetchWithTimeout(`/api/events/${params.id}/problems`, {
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

      toast.success('Problem statement added')
      setNewProblem({ title: '', description: '', max_selections: 1 }) // Reset form
      fetchData() // Refresh list

    } catch (error) {
      console.error('Error adding problem:', error)
      toast.error('Failed to add problem statement')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 3. Handle Delete
  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This cannot be undone.')) return

    try {
      // [FIX] Use API for delete
      const response = await fetchWithTimeout(`/api/events/${params.id}/problems/${id}`, {
          method: 'DELETE',
          headers: {
              'Authorization': `Bearer ${session?.access_token}`
          },
          timeout: 15000
      })

      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      
      toast.success('Problem statement deleted')
      setProblems(prev => prev.filter(p => p.id !== id))

    } catch (error) {
      console.error('Error deleting problem:', error)
      toast.error('Failed to delete')
    }
  }

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading problems...</div>
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/events/${params.id}/dashboard`}>
            <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
            </Button>
        </Link>
        <div>
            <h1 className="text-2xl font-bold">Problem Statements</h1>
            <p className="text-gray-500 text-sm">Manage challenges for {eventTitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Add New Form */}
        <Card className="lg:col-span-1 h-fit border-brand-red/20 shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg text-brand-red">Add New Problem</CardTitle>
                <CardDescription>Define a challenge for participants.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAdd} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Problem Title</Label>
                        <Input 
                            id="title"
                            placeholder="e.g., AI for Healthcare"
                            value={newProblem.title}
                            onChange={(e) => setNewProblem({...newProblem, title: e.target.value})}
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="desc">Description</Label>
                        <Textarea 
                            id="desc"
                            placeholder="Detailed explanation of the problem..."
                            rows={4}
                            value={newProblem.description}
                            onChange={(e) => setNewProblem({...newProblem, description: e.target.value})}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="limit">Selection Limit (Teams)</Label>
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <Input 
                                id="limit"
                                type="number"
                                min="1"
                                value={newProblem.max_selections}
                                onChange={(e) => setNewProblem({...newProblem, max_selections: e.target.value})}
                                required
                            />
                        </div>
                        <p className="text-xs text-gray-400">
                            Max number of teams that can choose this problem.
                        </p>
                    </div>

                    <Button 
                        type="submit" 
                        className="w-full bg-brand-gradient" 
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        Add Problem
                    </Button>
                </form>
            </CardContent>
        </Card>

        {/* RIGHT COLUMN: List of Existing Problems */}
        <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                Existing Statements 
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{problems.length}</span>
            </h2>

            {problems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
                    <p className="text-gray-400">No problem statements added yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {problems.map((prob) => (
                        <Card key={prob.id} className="group relative hover:border-brand-red/50 transition-colors">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg font-bold">{prob.title}</CardTitle>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-gray-400 hover:text-red-600 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDelete(prob.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                    {prob.description || 'No description provided.'}
                                </p>
                                <div className="flex items-center gap-2 text-xs font-medium text-brand-red bg-red-50 w-fit px-2 py-1 rounded">
                                    <Users className="h-3 w-3" />
                                    Max Teams: {prob.max_selections}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  )
}