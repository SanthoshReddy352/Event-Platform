import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import QuizResultClient from './QuizResultClient';
import { Loader2 } from 'lucide-react';

// ============================================================================
// Quiz Result Page Server Component - Handles SSR authentication
// ============================================================================
export default async function QuizResultPage({ params }) {
  const supabase = createClient();
  
  // Check Authentication on Server
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login?redirect=/events/' + params.id + '/quiz/result');
  }

  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand-orange" />
      </div>
    }>
      <QuizResultClient />
    </Suspense>
  );
}
