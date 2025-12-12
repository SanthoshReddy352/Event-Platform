'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Calendar, CheckCircle, LayoutGrid, Plus } from 'lucide-react'
import AdminEventCard from '@/components/admin/AdminEventCard'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AdminEventsClient({ 
  events = [], 
  userId, 
  isSuperAdmin,
  participantCounts = {} 
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Filter events based on search
  const filterEvents = (eventsList) => {
    if (!searchTerm) return eventsList
    return eventsList.filter(event =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  // Split events by status
  const now = new Date()
  const activeEvents = events.filter(e => {
    const isCompleted = e.event_end_date && new Date() > new Date(e.event_end_date)
    return e.is_active && !isCompleted
  })
  const completedEvents = events.filter(e => {
    return e.event_end_date && new Date() > new Date(e.event_end_date)
  })

  // Apply search filter to each category
  const filteredAll = filterEvents(events)
  const filteredActive = filterEvents(activeEvents)
  const filteredCompleted = filterEvents(completedEvents)

  // Get current filtered list based on tab
  const getCurrentEvents = () => {
    switch (activeTab) {
      case 'active': return filteredActive
      case 'completed': return filteredCompleted
      default: return filteredAll
    }
  }

  const EmptyState = ({ type }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full"
    >
      <Card className="border-gray-800 bg-black/40 backdrop-blur-md border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-gray-900 rounded-full p-4 mb-4">
            {type === 'active' ? (
              <Calendar className="w-8 h-8 text-green-400" />
            ) : type === 'completed' ? (
              <CheckCircle className="w-8 h-8 text-gray-400" />
            ) : (
              <LayoutGrid className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            {searchTerm ? `No events matching "${searchTerm}"` : `No ${type} events`}
          </h3>
          <p className="text-gray-400 max-w-sm mb-6">
            {searchTerm
              ? 'Try adjusting your search terms'
              : type === 'active'
                ? 'Create a new event to get started'
                : type === 'completed'
                  ? 'Completed events will appear here'
                  : 'You haven\'t created any events yet'}
          </p>
          {!searchTerm && type !== 'completed' && (
            <Link href="/admin/events/new">
              <Button className="bg-brand-gradient text-white">
                <Plus size={16} className="mr-2" />
                Create Event
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )

  const EventGrid = ({ events: eventsList, type }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <AnimatePresence mode="popLayout">
        {eventsList.length > 0 ? (
          eventsList.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
              layout
            >
              <AdminEventCard
                event={event}
                userId={userId}
                isSuperAdmin={isSuperAdmin}
                participantCount={participantCounts[event.id] || 0}
              />
            </motion.div>
          ))
        ) : (
          <EmptyState type={type} />
        )}
      </AnimatePresence>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search events by title or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-black/40 border-gray-800 focus:border-brand-red/50 transition-colors"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-gray-800 p-1">
          <TabsTrigger 
            value="all" 
            className="gap-2 data-[state=active]:bg-gray-800 data-[state=active]:text-white"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">All</span>
            <Badge variant="secondary" className="ml-1 bg-gray-700 text-gray-300 text-xs">
              {filteredAll.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="active" 
            className="gap-2 data-[state=active]:bg-green-900/30 data-[state=active]:text-green-400"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Active</span>
            <Badge className="ml-1 bg-green-900/30 text-green-400 border-green-900/50 text-xs">
              {filteredActive.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="completed" 
            className="gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-gray-300"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Completed</span>
            <Badge variant="secondary" className="ml-1 bg-gray-700 text-gray-400 text-xs">
              {filteredCompleted.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="all" className="mt-0">
            <EventGrid events={filteredAll} type="all" />
          </TabsContent>

          <TabsContent value="active" className="mt-0">
            <EventGrid events={filteredActive} type="active" />
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            <EventGrid events={filteredCompleted} type="completed" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
