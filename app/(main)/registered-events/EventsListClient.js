'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EventCard from '@/components/EventCard'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, History, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import LastWordGradientText from '@/components/LastWordGradientText'

export default function EventsListClient({ upcomingEvents = [], pastEvents = [] }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filterEvents = (events) => {
    if (!searchTerm) return events
    return events.filter(event => 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.club?.club_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const filteredUpcoming = filterEvents(upcomingEvents)
  const filteredPast = filterEvents(pastEvents)

  const EmptyState = ({ type }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full"
    >
      <Card className="bg-card/50 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-muted rounded-full p-4 mb-4">
            {type === 'upcoming' ? (
              <Calendar className="w-8 h-8 text-muted-foreground" />
            ) : (
              <History className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-xl font-semibold mb-2">No {type} events found</h3>
          <p className="text-muted-foreground max-w-sm">
            {searchTerm 
              ? `No events matching "${searchTerm}"`
              : type === 'upcoming' 
                ? "You haven't registered for any upcoming events yet."
                : "You don't have any past events."}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )

  const EventGrid = ({ events, type }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <AnimatePresence mode="popLayout">
        {events.length > 0 ? (
          events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              layout
            >
              <EventCard event={event} />
            </motion.div>
          ))
        ) : (
          <EmptyState type={type} />
        )}
      </AnimatePresence>
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 max-w-[400px]">
          <TabsTrigger value="upcoming" className="gap-2">
            <Calendar className="w-4 h-4" />
            Upcoming
            <span className="ml-1.5 py-0.5 px-2 bg-primary/10 text-primary text-xs rounded-full">
              {filteredUpcoming.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            <History className="w-4 h-4" />
            Past
            <span className="ml-1.5 py-0.5 px-2 bg-muted text-muted-foreground text-xs rounded-full">
              {filteredPast.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-0">
          <EventGrid events={filteredUpcoming} type="upcoming" />
        </TabsContent>

        <TabsContent value="past" className="mt-0">
          <EventGrid events={filteredPast} type="past" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
