"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, Flag, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// Quiz Client Component - Handles all interactive quiz functionality
// ============================================================================
export default function QuizClient({ 
  event, 
  questions: initialQuestions, 
  previousAttempt,
  initialTimeLeft,
  quizNotStarted,
  quizEnded,
  startTime 
}) {
  const { session } = useAuth();
  const { id: eventId } = useParams();
  const router = useRouter();
  
  // Shuffle helper - memoized to maintain consistent shuffle during session
  const shuffleArray = useCallback((array, seed = Date.now()) => {
    const newArray = [...array];
    // Simple seeded shuffle for consistency
    let currentIndex = newArray.length;
    let randomValue;
    
    while (currentIndex !== 0) {
      randomValue = Math.abs(Math.sin(seed + currentIndex) * 10000) % 1;
      currentIndex--;
      const randomIndex = Math.floor(randomValue * (currentIndex + 1));
      [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
  }, []);

  // Process and shuffle questions/options once on initial render
  const [questions] = useState(() => {
    if (!initialQuestions?.length) return [];
    
    const seed = previousAttempt?.id ? previousAttempt.id.charCodeAt(0) : Date.now();
    
    const processedQuestions = initialQuestions.map(q => {
      const optionsWithIndex = q.options.map((opt, i) => ({
        text: opt,
        originalIndex: i
      }));
      const shuffledOptions = shuffleArray(optionsWithIndex, seed + q.id.charCodeAt(0));
      return {
        ...q,
        options: shuffledOptions
      };
    });
    
    return shuffleArray(processedQuestions, seed);
  });

  // State
  const [answers, setAnswers] = useState(() => previousAttempt?.answers || {});
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [attemptId, setAttemptId] = useState(previousAttempt?.id || null);
  const [markedForReview, setMarkedForReview] = useState(() => 
    new Set(previousAttempt?.marked_for_review || [])
  );
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);

  // LocalStorage Key
  const STORAGE_KEY = `quiz_progress_${eventId}`;

  // Load from LocalStorage on mount
  useEffect(() => {
    if (!eventId) return;
    
    const saved = localStorage.getItem(STORAGE_KEY);
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
      } catch (e) {
        console.error("Failed to parse local storage", e);
      }
    }
  }, [eventId, STORAGE_KEY]);

  // Save to LocalStorage on change
  useEffect(() => {
    if (submitting) return;
    
    const payload = {
      answers,
      markedForReview: Array.from(markedForReview),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [answers, markedForReview, STORAGE_KEY, submitting]);

  // Auto-save to DB (debounced)
  useEffect(() => {
    if (submitting || !session) return;
    
    const timer = setTimeout(() => {
      saveProgress();
    }, 2000);

    return () => clearTimeout(timer);
  }, [answers, markedForReview, session, submitting]);

  // Timer countdown
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

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !submitting) {
      handleSubmit();
    }
  }, [timeLeft, submitting]);

  // Save progress to database
  const saveProgress = async () => {
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

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
        localStorage.removeItem(STORAGE_KEY);
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

  // Error states
  if (quizNotStarted) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-md mx-auto bg-zinc-900 border-zinc-800">
            <CardContent className="py-8">
              <div className="mx-auto bg-yellow-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="text-xl font-bold text-yellow-500 mb-2">Quiz Not Started Yet</h2>
              <p className="text-gray-400 mb-4">
                Quiz starts at {new Date(startTime).toLocaleString()}
              </p>
              <Button 
                className="border-zinc-700" 
                variant="outline"
                onClick={() => router.push(`/events/${eventId}`)}
              >
                Back to Event
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (quizEnded) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-md mx-auto bg-zinc-900 border-zinc-800">
            <CardContent className="py-8">
              <div className="mx-auto bg-red-500/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-red-500 mb-2">Quiz Has Ended</h2>
              <p className="text-gray-400 mb-4">
                This quiz is no longer accepting submissions.
              </p>
              <Button 
                className="border-zinc-700" 
                variant="outline"
                onClick={() => router.push(`/events/${eventId}`)}
              >
                Back to Event
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Card className="max-w-md mx-auto bg-zinc-900 border-zinc-800">
          <CardContent className="py-8">
            <h2 className="text-xl font-bold text-gray-400 mb-2">No Questions</h2>
            <p className="text-gray-500">This quiz has no questions yet.</p>
            <Button 
              className="mt-4 border-zinc-700" 
              variant="outline"
              onClick={() => router.push(`/events/${eventId}`)}
            >
              Back to Event
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header with Title and Timer */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">{event?.title || "Quiz"}</h1>
          <div className="flex items-center gap-4 text-gray-400">
            <p>Question {currentQuestionIndex + 1} of {questions.length}</p>
            <AnimatePresence>
              {saving && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center text-brand-orange text-sm"
                >
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Saving...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {timeLeft !== null && (
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className={`text-2xl font-mono font-bold px-4 py-2 rounded-lg border ${
              timeLeft < 60 
                ? 'bg-red-900/20 text-red-400 border-red-500/50 animate-pulse' 
                : 'bg-zinc-800 text-gray-300 border-zinc-700'
            }`}
          >
            {formatTime(timeLeft)}
          </motion.div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Question Area */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="bg-zinc-900 border-zinc-800 min-h-[400px] flex flex-col">
                <CardHeader className="flex flex-row justify-between items-start">
                  <CardTitle className="text-xl font-medium text-white leading-relaxed">
                    <span className="text-brand-orange mr-2">{currentQuestionIndex + 1}.</span>
                    {currentQuestion.question_text}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMarkForReview(currentQuestion.id)}
                    className={`${markedForReview.has(currentQuestion.id) ? 'text-yellow-500 bg-yellow-500/10' : 'text-gray-500 hover:text-yellow-500'}`}
                  >
                    <Flag className="h-5 w-5 mr-2" />
                    {markedForReview.has(currentQuestion.id) ? 'Marked' : 'Mark for Review'}
                  </Button>
                </CardHeader>
                <CardContent className="flex-grow">
                  <RadioGroup
                    value={answers[currentQuestion.id]?.toString()}
                    onValueChange={(val) => handleOptionSelect(currentQuestion.id, parseInt(val))}
                    className="space-y-4 mt-4"
                  >
                    {currentQuestion.options.map((opt, i) => (
                      <motion.div 
                        key={i}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer ${
                          answers[currentQuestion.id] === opt.originalIndex 
                            ? 'bg-brand-orange/10 border-brand-orange/50' 
                            : 'bg-zinc-950/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                        }`}
                        onClick={() => handleOptionSelect(currentQuestion.id, opt.originalIndex)}
                      >
                        <RadioGroupItem 
                          value={opt.originalIndex.toString()} 
                          id={`opt-${i}`} 
                          className="border-gray-500 text-brand-orange"
                        />
                        <Label 
                          htmlFor={`opt-${i}`} 
                          className={`flex-grow cursor-pointer text-base ${
                            answers[currentQuestion.id] === opt.originalIndex 
                              ? 'text-brand-orange' 
                              : 'text-gray-300'
                          }`}
                        >
                          {opt.text}
                        </Label>
                      </motion.div>
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

                  {answers[currentQuestion.id] !== undefined && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearSelection(currentQuestion.id)}
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
            </motion.div>
          </AnimatePresence>
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
                    <motion.button
                      key={q.id}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`h-10 w-10 rounded-md flex items-center justify-center text-sm font-medium border transition-all relative ${bgClass}`}
                    >
                      {idx + 1}
                      {isMarked && !isCurrent && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full -mt-1 -mr-1"></div>}
                    </motion.button>
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
