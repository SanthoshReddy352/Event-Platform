"use client";

import { useSearchParams, useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, ArrowLeft, PartyPopper } from "lucide-react";
import { motion } from "framer-motion";

// ============================================================================
// Quiz Result Client Component - Displays quiz submission result
// ============================================================================
export default function QuizResultClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { id: eventId } = useParams();
  
  const attempted = searchParams.get("attempted");
  const total = searchParams.get("total");
  
  const percentage = total > 0 ? Math.round((attempted / total) * 100) : 0;

  return (
    <div className="container mx-auto px-4 py-20 max-w-md text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <Card className="bg-zinc-900 border-zinc-800 shadow-lg overflow-hidden">
          {/* Confetti Effect Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#f97316', '#22c55e', '#eab308', '#ec4899', '#8b5cf6'][i % 5],
                  left: `${Math.random() * 100}%`,
                  top: `-10%`,
                }}
                animate={{
                  y: ['0%', '1000%'],
                  rotate: [0, 360],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  delay: Math.random() * 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            ))}
          </div>
          
          <CardHeader className="relative">
            <motion.div 
              className="mx-auto bg-gradient-to-br from-brand-orange to-yellow-500 p-1 rounded-full w-24 h-24 flex items-center justify-center mb-4"
              animate={{ 
                boxShadow: [
                  '0 0 20px rgba(249, 115, 22, 0.3)',
                  '0 0 40px rgba(249, 115, 22, 0.5)',
                  '0 0 20px rgba(249, 115, 22, 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="bg-zinc-900 rounded-full w-full h-full flex items-center justify-center">
                <Trophy className="w-10 h-10 text-brand-orange" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
              <PartyPopper className="w-6 h-6 text-yellow-500" />
              Quiz Submitted!
              <PartyPopper className="w-6 h-6 text-yellow-500 scale-x-[-1]" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            <div>
              <p className="text-gray-400 mb-2">Questions Attempted</p>
              <motion.div 
                className="text-5xl font-bold text-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              >
                {attempted} <span className="text-xl text-gray-500">/ {total}</span>
              </motion.div>
              
              {/* Progress Bar */}
              <div className="mt-4 w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-brand-orange to-yellow-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">{percentage}% completed</p>
            </div>
            
            <motion.p 
              className="text-sm text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Thank you for participating. Your results have been recorded.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <Button 
                className="w-full border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white" 
                variant="outline"
                onClick={() => router.push(`/events/${eventId}`)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Event
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
