"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

function QuizResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { id: eventId } = useParams();
  
  const attempted = searchParams.get("attempted");
  const total = searchParams.get("total");

  return (
    <div className="container mx-auto px-4 py-20 max-w-md text-center">
      <Card className="bg-zinc-900 border-zinc-800 shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-brand-orange/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4">
            <Trophy className="w-10 h-10 text-brand-orange" />
          </div>
          <CardTitle className="text-2xl text-white">Quiz Submitted!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-gray-400 mb-1">Questions Attempted</p>
            <div className="text-4xl font-bold text-white">
              {attempted} <span className="text-xl text-gray-500">/ {total}</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-400">
            Thank you for participating. Your results have been recorded.
          </p>

          <Button 
            className="w-full border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white" 
            variant="outline"
            onClick={() => router.push(`/events/${eventId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function QuizResultPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?redirect=" + window.location.pathname);
      } else {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  if (checkingAuth) {
      return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  }

  return <QuizResultContent />;
}
