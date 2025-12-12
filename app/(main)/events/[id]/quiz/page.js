"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, Flag } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

import { useAuth } from '@/context/AuthContext'

function QuizContent() {
  const { session } = useAuth() // Cache session
  const { id: eventId } = useParams();
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId: optionIndex }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [event, setEvent] = useState(null);

  const [timeLeft, setTimeLeft] = useState(null); // in seconds
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [attemptId, setAttemptId] = useState(null);
  const [markedForReview, setMarkedForReview] = useState(new Set());

  useEffect(() => {
    fetchQuizData();
  }, [eventId]);

  const [saving, setSaving] = useState(false);

  // LocalStorage Key
  const STORAGE_KEY = `quiz_progress_${eventId}_${attemptId || 'new'}`;

  // Load from LocalStorage on mount (or when attemptId is set)
  useEffect(() => {
      if (!eventId) return;
      
      // Try to load from local storage
      const saved = localStorage.getItem(`quiz_progress_${eventId}`);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              if (parsed.answers) setAnswers(prev => ({ ...prev, ...parsed.answers }));
              if (parsed.markedForReview) {
                  setMarkedForReview(prev => {
                      const newSet = new Set(prev);
                      parsed.markedForReview.forEach(id => newSet.add(id));
                      return newSet;
                  });
              }
              console.log("Restored from LocalStorage:", parsed);
          } catch (e) {
              console.error("Failed to parse local storage", e);
          }
      }
  }, [eventId]);

  // Save to LocalStorage on change
  useEffect(() => {
      if (loading || submitting) return;
      
      const payload = {
          answers,
          markedForReview: Array.from(markedForReview),
          updatedAt: new Date().toISOString()
      };
      localStorage.setItem(`quiz_progress_${eventId}`, JSON.stringify(payload));
  }, [answers, markedForReview, eventId]);

  // Auto-save effect (Keep DB sync as backup)
  useEffect(() => {
    if (loading || submitting) return;
    
    const timer = setTimeout(() => {
        saveProgress();
    }, 1000); // Debounce 1s

    return () => clearTimeout(timer);
  }, [answers, markedForReview]);

  const saveProgress = async () => {
      // ... (keep existing DB save logic)
      if (!session) return;

      setSaving(true);
      try {
        const payload = {
            event_id: eventId,
            user_id: session.user.id,
            answers,
            marked_for_review: Array.from(markedForReview),
            status: 'in_progress'
        };
        
        // ... (rest of save logic)
        let currentAttemptId = attemptId;

        if (!currentAttemptId) {
            const { data: existing } = await supabase
                .from('quiz_attempts')
                .select('id')
                .eq('event_id', eventId)
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            if (existing) {
                currentAttemptId = existing.id;
                setAttemptId(existing.id);
            }
        }

        if (currentAttemptId) {
            const { error } = await supabase.from('quiz_attempts').update(payload).eq('id', currentAttemptId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase.from('quiz_attempts').insert(payload).select().single();
            if (error) throw error;
            if (data) setAttemptId(data.id);
        }

      } catch (err) {
          console.error("Failed to save progress:", err);
      } finally {
          setSaving(false);
      }
  };

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft !== null]);

  useEffect(() => {
      if (timeLeft === 0 && !submitting && !loading) {
          handleSubmit();
      }
  }, [timeLeft]);

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

    const fetchQuizData = async () => {
    // ... (keep existing fetch logic)
    try {
      // [FIX] Use cached session
      
      // ... (Event Details)
      const eventRes = await fetch(`/api/events/${eventId}`, {
         headers: { Authorization: `Bearer ${session?.access_token}` },
         cache: 'no-store'
      });
      const eventData = await eventRes.json();
      if (eventData.success) {
          setEvent(eventData.event);
          // ... (Timing checks)
          const now = new Date();
          const start = eventData.event.submission_start ? new Date(eventData.event.submission_start) : null;
          const end = eventData.event.submission_end ? new Date(eventData.event.submission_end) : null;
          
          if (start && now < start) {
              setError(`Quiz starts at ${start.toLocaleString()}`);
              setLoading(false);
              return;
          }
          if (end) {
              if (now > end) {
                  setError("Quiz has ended.");
                  setLoading(false);
                  return;
              }
              const remaining = Math.floor((end - now) / 1000);
              setTimeLeft(remaining);
          }
      }

      // 2. Fetch Questions (API)
      console.log("Fetching questions...");
      const questionsRes = await fetch(`/api/events/${eventId}/quiz`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        cache: 'no-store'
      });

      if (!questionsRes.ok) {
          const text = await questionsRes.text();
          console.error("Questions API Error:", questionsRes.status, text);
          throw new Error(`API Error: ${questionsRes.status} - ${text}`);
      }

      const questionsData = await questionsRes.json();
      if (!questionsData.success) {
          throw new Error(questionsData.error || "Failed to fetch questions");
      }

      // 3. Fetch Attempt (Supabase)
      console.log("Fetching attempt...");
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      // Handle Attempt
      if (attemptData) {
          const prev = attemptData;
          if (prev.status === 'completed') {
              const attemptedCount = Object.keys(prev.answers || {}).length;
              const totalCount = questionsData.questions.length;
              router.replace(`/events/${eventId}/quiz/result?attempted=${attemptedCount}&total=${totalCount}`);
              return;
          }
          console.log("Restoring attempt from DB:", prev);
          setAttemptId(prev.id);
          setAnswers(prev.answers || {});
          if (prev.marked_for_review) {
              setMarkedForReview(new Set(prev.marked_for_review));
          }
      }



        // ... (Shuffle logic)
        const processedQuestions = questionsData.questions.map(q => {
            const optionsWithIndex = q.options.map((opt, i) => ({
                text: opt,
                originalIndex: i
            }));
            const shuffledOptions = shuffleArray(optionsWithIndex);
            return {
                ...q,
                options: shuffledOptions
            };
        });
        const shuffledQuestions = shuffleArray(processedQuestions);
        setQuestions(shuffledQuestions);

    } catch (error) {
      console.error("Error fetching quiz:", error);
      setError("Failed to load quiz. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (questionId, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const toggleMarkForReview = (questionId) => {
      setMarkedForReview(prev => {
          const newSet = new Set(prev);
          if (newSet.has(questionId)) {
              newSet.delete(questionId);
          } else {
              newSet.add(questionId);
          }
          return newSet;
      });
  };

  const clearSelection = (questionId) => {
      setAnswers(prev => {
          const newAnswers = { ...prev };
          delete newAnswers[questionId];
          return newAnswers;
      });
  };

  const handleSubmit = async () => {
    // ... (Confirmation)
    if (timeLeft > 0 && Object.keys(answers).length < questions.length) {
      if (!confirm("You haven't answered all questions. Submit anyway?")) return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/quiz/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          answers,
          started_at: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Clear LocalStorage on success
        localStorage.removeItem(`quiz_progress_${eventId}`);
        
        router.push(`/events/${eventId}/quiz/result?attempted=${Object.keys(answers).length}&total=${questions.length}`);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to submit quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Card className="max-w-md mx-auto">
            <CardContent className="py-8">
                <h2 className="text-xl font-bold text-red-500 mb-2">Quiz Unavailable</h2>
                <p className="text-gray-600">{error}</p>
                <Button className="mt-4" onClick={() => router.push(`/events/${eventId}`)}>Back to Event</Button>
            </CardContent>
        </Card>
      </div>
    );
  }



  // ... (keep existing effects and helpers)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header with Title and Timer */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold mb-2 text-white">{event?.title || "Quiz"}</h1>
            <div className="flex items-center gap-4 text-gray-400">
                <p>Question {currentQuestionIndex + 1} of {questions.length}</p>
                {saving && (
                    <div className="flex items-center text-brand-orange text-sm animate-pulse">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Saving...
                    </div>
                )}
            </div>
        </div>
        {timeLeft !== null && (
            <div className={`text-2xl font-mono font-bold px-4 py-2 rounded-lg border ${timeLeft < 60 ? 'bg-red-900/20 text-red-400 border-red-500/50 animate-pulse' : 'bg-zinc-800 text-gray-300 border-zinc-700'}`}>
                {formatTime(timeLeft)}
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Question Area */}
        <div className="lg:col-span-3 space-y-6">
          {questions.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800 min-h-[400px] flex flex-col">
              <CardHeader className="flex flex-row justify-between items-start">
                <CardTitle className="text-xl font-medium text-white leading-relaxed">
                  <span className="text-brand-orange mr-2">{currentQuestionIndex + 1}.</span>
                  {questions[currentQuestionIndex].question_text}
                </CardTitle>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMarkForReview(questions[currentQuestionIndex].id)}
                    className={`${markedForReview.has(questions[currentQuestionIndex].id) ? 'text-yellow-500 bg-yellow-500/10' : 'text-gray-500 hover:text-yellow-500'}`}
                >
                    <Flag className="h-5 w-5 mr-2" />
                    {markedForReview.has(questions[currentQuestionIndex].id) ? 'Marked' : 'Mark for Review'}
                </Button>
              </CardHeader>
              <CardContent className="flex-grow">
                <RadioGroup
                  value={answers[questions[currentQuestionIndex].id]?.toString()}
                  onValueChange={(val) => handleOptionSelect(questions[currentQuestionIndex].id, parseInt(val))}
                  className="space-y-4 mt-4"
                >
                  {questions[currentQuestionIndex].options.map((opt, i) => (
                    <div 
                        key={i} 
                        className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer ${
                            answers[questions[currentQuestionIndex].id] === opt.originalIndex 
                            ? 'bg-brand-orange/10 border-brand-orange/50' 
                            : 'bg-zinc-950/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                        }`}
                        onClick={() => handleOptionSelect(questions[currentQuestionIndex].id, opt.originalIndex)}
                    >
                      <RadioGroupItem 
                        value={opt.originalIndex.toString()} 
                        id={`opt-${i}`} 
                        className="border-gray-500 text-brand-orange"
                      />
                      <Label htmlFor={`opt-${i}`} className={`flex-grow cursor-pointer text-base ${answers[questions[currentQuestionIndex].id] === opt.originalIndex ? 'text-brand-orange' : 'text-gray-300'}`}>
                        {opt.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
              
              {/* Navigation Buttons */}
              <div className="p-6 border-t border-zinc-800 flex justify-between items-center mt-auto">
                <Button 
                    variant="outline" 
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white"
                >
                    Previous
                </Button>

                {answers[questions[currentQuestionIndex].id] !== undefined && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearSelection(questions[currentQuestionIndex].id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                        Clear Selection
                    </Button>
                )}
                
                {currentQuestionIndex < questions.length - 1 ? (
                    <Button 
                        onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                        className="bg-brand-gradient text-white border-0"
                    >
                        Next
                    </Button>
                ) : (
                    <Button 
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="bg-green-600 hover:bg-green-700 text-white border-0"
                    >
                        {submitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                        Submit Quiz
                    </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Question Palette Sidebar */}
        <div className="lg:col-span-1">
            <Card className="bg-zinc-900 border-zinc-800 sticky top-4">
                <CardHeader>
                    <CardTitle className="text-lg text-white">Question Palette</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-5 gap-2">
                        {questions.map((q, idx) => {
                            const isAnswered = answers[q.id] !== undefined;
                            const isMarked = markedForReview.has(q.id);
                            const isCurrent = currentQuestionIndex === idx;
                            
                            let bgClass = "bg-zinc-800 text-gray-400 border-zinc-700 hover:bg-zinc-700";
                            
                            if (isCurrent) {
                                bgClass = "bg-brand-orange text-white border-brand-orange ring-2 ring-brand-orange/30";
                            } else if (isMarked) {
                                bgClass = "bg-yellow-500/20 text-yellow-500 border-yellow-500/50";
                            } else if (isAnswered) {
                                bgClass = "bg-green-600/20 text-green-400 border-green-600/50";
                            }

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={`h-10 w-10 rounded-md flex items-center justify-center text-sm font-medium border transition-all relative ${bgClass}`}
                                >
                                    {idx + 1}
                                    {isMarked && !isCurrent && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full -mt-1 -mr-1"></div>}
                                </button>
                            )
                        })}
                    </div>
                    
                    <div className="mt-6 space-y-2 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-brand-orange"></div> Current
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-green-600/20 border border-green-600/50"></div> Answered
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/50"></div> Marked for Review
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-zinc-800 border border-zinc-700"></div> Unanswered
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-zinc-800">
                        <Button
                            className="w-full bg-brand-gradient text-white border-0"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                            Submit Quiz
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

export default function QuizPage() {
  const router = useRouter();
  const { session, loading } = useAuth(); // [FIX] Use cached session

  useEffect(() => {
    if (!loading && !session) {
      router.push("/login?redirect=" + window.location.pathname);
    }
  }, [session, loading]);

  if (loading) {
      return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  }

  return session ? <QuizContent /> : null;
}
