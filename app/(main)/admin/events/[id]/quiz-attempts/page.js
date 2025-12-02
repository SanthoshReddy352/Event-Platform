'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, FileText, Eye, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'

function QuizAttemptsContent() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const { user, isSuperAdmin, loading: authLoading } = useAuth()

  // Dialog State
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
        if (!params.id || !user?.id) return;
        
        setLoading(true);
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) throw new Error("User not authenticated");
            
            // 1. Fetch Event
            const eventResponse = await fetch(`/api/events/${params.id}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const eventData = await eventResponse.json();
            if (!eventData.success) throw new Error(eventData.error || "Failed to fetch event");
            
            if (mounted) setEvent(eventData.event);

            // 2. Fetch Questions (for details view)
            const questionsResponse = await fetch(`/api/events/${params.id}/quiz`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const questionsData = await questionsResponse.json();
            if (questionsData.success && mounted) {
                setQuestions(questionsData.questions);
            }

            // 3. Fetch Attempts (using new API route)
            const attemptsResponse = await fetch(`/api/events/${params.id}/quiz-attempts`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const attemptsData = await attemptsResponse.json();

            if (!attemptsData.success) throw new Error(attemptsData.error || "Failed to fetch attempts");
            
            if (mounted) setAttempts(attemptsData.attempts);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            if (mounted) setLoading(false);
        }
    };

    loadData();

    return () => { mounted = false; };
  }, [params.id, user?.id]);

  const handleViewDetails = (attempt) => {
      setSelectedAttempt(attempt);
      setIsDetailsOpen(true);
  }

  if (loading || authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-brand-red" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Button
        variant="ghost"
        onClick={() => router.push(`/admin/events/${params.id}/dashboard`)}
        className="mb-4"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Dashboard
      </Button>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-brand-red" />
            Quiz Submissions
          </h1>
          <p className="text-gray-500 mt-2">{event?.title}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leaderboard ({attempts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No submissions yet.
                  </TableCell>
                </TableRow>
              ) : (
                attempts.map((attempt, index) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>{attempt.email}</TableCell>
                    <TableCell>
                        <Badge variant="secondary" className="text-lg">
                            {attempt.score}
                        </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(attempt.completed_at), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(attempt)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Answers
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              Participant: {selectedAttempt?.email} | Score: {selectedAttempt?.score}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {selectedAttempt && questions.map((q, idx) => {
                const userAnswerIndex = selectedAttempt.answers[q.id];
                const isCorrect = userAnswerIndex === q.correct_option_index;
                
                return (
                    <Card key={q.id} className={`border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between">
                                <h3 className="font-semibold text-gray-900">
                                    {idx + 1}. {q.question_text}
                                </h3>
                                {isCorrect ? (
                                    <Badge className="bg-green-500 hover:bg-green-600">Correct (+{q.points})</Badge>
                                ) : (
                                    <Badge variant="destructive">Incorrect</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-500 mb-1">User Answer:</p>
                                    <div className={`p-2 rounded border ${isCorrect ? 'bg-green-100 border-green-300 text-green-800' : 'bg-red-100 border-red-300 text-red-800'}`}>
                                        {userAnswerIndex !== undefined ? q.options[userAnswerIndex] : 'Skipped'}
                                    </div>
                                </div>
                                {!isCorrect && (
                                    <div>
                                        <p className="text-gray-500 mb-1">Correct Answer:</p>
                                        <div className="p-2 rounded border bg-green-100 border-green-300 text-green-800">
                                            {q.options[q.correct_option_index]}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function QuizAttemptsPage() {
  return (
    <ProtectedRoute>
      <QuizAttemptsContent />
    </ProtectedRoute>
  )
}
