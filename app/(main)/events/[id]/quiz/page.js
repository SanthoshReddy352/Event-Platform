import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import QuizClient from './QuizClient';

// ============================================================================
// Quiz Page Server Component - Fetches all data on the server for SEO
// ============================================================================
export default async function QuizPage({ params }) {
  const supabase = createClient();
  
  // 1. Check Authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login?redirect=/events/' + params.id + '/quiz');
  }

  // 2. Fetch Event Data
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', params.id)
    .single();

  if (eventError || !event) {
    notFound();
  }

  // 3. Calculate Quiz Timing
  const now = new Date();
  const startTime = event.submission_start ? new Date(event.submission_start) : null;
  const endTime = event.submission_end ? new Date(event.submission_end) : null;
  
  let quizNotStarted = false;
  let quizEnded = false;
  let initialTimeLeft = null;

  if (startTime && now < startTime) {
    quizNotStarted = true;
  }
  
  if (endTime) {
    if (now > endTime) {
      quizEnded = true;
    } else {
      initialTimeLeft = Math.floor((endTime - now) / 1000);
    }
  }

  // 4. Fetch Quiz Questions (sanitized - no correct answers)
  const { data: questions, error: questionsError } = await supabaseAdmin
    .from('quiz_questions')
    .select('id, event_id, question_text, options, points, created_at')
    .eq('event_id', params.id)
    .order('created_at', { ascending: true });

  if (questionsError) {
    console.error('Error fetching questions:', questionsError);
  }

  // 5. Check for Previous Attempt
  const { data: previousAttempt } = await supabaseAdmin
    .from('quiz_attempts')
    .select('*')
    .eq('event_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  // 6. If already completed, redirect to results
  if (previousAttempt?.status === 'completed') {
    const attemptedCount = Object.keys(previousAttempt.answers || {}).length;
    const totalCount = questions?.length || 0;
    redirect(`/events/${params.id}/quiz/result?attempted=${attemptedCount}&total=${totalCount}`);
  }

  // 7. Render Quiz Client with Server Data
  return (
    <QuizClient 
      event={event}
      questions={questions || []}
      previousAttempt={previousAttempt}
      initialTimeLeft={initialTimeLeft}
      quizNotStarted={quizNotStarted}
      quizEnded={quizEnded}
      startTime={startTime?.toISOString()}
    />
  );
}
