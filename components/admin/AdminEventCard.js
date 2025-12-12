'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Users, LayoutDashboard, Loader2, Calendar, Clock } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function AdminEventCard({ event, userId, isSuperAdmin, participantCount = 0 }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  
  const canManage = isSuperAdmin || (userId && event.created_by === userId);
  const isCompleted = event.event_end_date && new Date() > new Date(event.event_end_date);
  
  // Calculate days until event
  const daysUntil = event.event_date ? differenceInDays(new Date(event.event_date), new Date()) : null
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return

    setIsDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (await response.json().then(d => d.success)) {
        router.refresh()
      } else {
        alert('Failed to delete event')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Error deleting event')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <TooltipProvider>
      <Card className="flex flex-col h-full border-gray-800 bg-black/40 backdrop-blur-md hover:border-brand-red/50 hover:shadow-lg hover:shadow-brand-red/5 transition-all duration-300 group overflow-hidden">
        {/* Top accent bar based on status */}
        <div className={`h-1 w-full ${
          isCompleted 
            ? 'bg-gray-600' 
            : event.is_active 
              ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
              : 'bg-gradient-to-r from-yellow-500 to-orange-400'
        }`} />
        
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-2 mb-2">
            {/* Title with Link */}
            <Link href={`/admin/events/${event.id}/dashboard`} className="hover:text-brand-red transition-colors flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-1 group-hover:text-brand-red transition-colors">
                {event.title}
              </CardTitle>
            </Link>
            
            {/* Status Badges */}
            <div className="flex gap-1.5 shrink-0">
              {/* Event Type Badge */}
              {event.event_type === 'hackathon' ? (
                <Badge variant="secondary" className="bg-blue-900/20 text-blue-400 border-blue-900/50 text-xs">
                  Hackathon
                </Badge>
              ) : event.event_type === 'mcq' ? (
                <Badge variant="secondary" className="bg-purple-900/20 text-purple-400 border-purple-900/50 text-xs">
                  Quiz
                </Badge>
              ) : event.event_type ? (
                <Badge variant="secondary" className="bg-teal-900/20 text-teal-400 border-teal-900/50 text-xs capitalize">
                  {event.event_type.replace('_', ' ')}
                </Badge>
              ) : null}
              {isCompleted ? (
                <Badge variant="secondary" className="bg-gray-800 text-gray-400 border-gray-700 text-xs">
                  Completed
                </Badge>
              ) : event.is_active ? (
                <Badge className="bg-green-900/20 text-green-400 border-green-900/50 text-xs animate-pulse">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-400 border-yellow-900/50 bg-yellow-900/10 text-xs">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
          
          <CardDescription className="line-clamp-2 text-gray-400 text-sm">
            {event.description || 'No description provided.'}
          </CardDescription>
          
          {/* Event Meta Info */}
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-800/50">
            {event.event_date && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar size={12} className="text-gray-600" />
                    <span>{format(new Date(event.event_date), 'MMM dd, yyyy')}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Event Date</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {daysUntil !== null && daysUntil >= 0 && !isCompleted && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock size={12} className="text-brand-red" />
                    <span className={daysUntil <= 3 ? 'text-brand-red font-medium' : 'text-gray-500'}>
                      {daysUntil === 0 ? 'Today!' : `${daysUntil}d left`}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Days until event</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users size={12} className="text-blue-400" />
                  <span className="text-blue-400 font-medium">{participantCount}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{participantCount} Registered Participant{participantCount !== 1 && 's'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        
        <CardFooter className="mt-auto flex flex-col gap-2 pt-0">
          <Link href={`/admin/events/${event.id}/dashboard`} className="w-full">
            <Button 
              className="w-full bg-slate-900 text-white hover:bg-slate-800 border border-slate-700 hover:border-brand-red/30 transition-all group/btn" 
              disabled={!canManage}
            >
              <LayoutDashboard size={16} className="mr-2 group-hover/btn:scale-110 transition-transform" />
              Open Dashboard
            </Button>
          </Link>

          {canManage && (
            <Button
              variant="destructive"
              className="w-full bg-red-900/10 text-red-400 hover:bg-red-900/20 border border-red-900/30 hover:border-red-500/50 transition-all"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 size={14} className="animate-spin mr-1.5" />
              ) : (
                <Trash2 size={14} className="mr-1.5" />
              )}
              {isDeleting ? 'Deleting...' : 'Delete Event'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </TooltipProvider>
  )
}
