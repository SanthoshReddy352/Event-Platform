'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Download, Users, CheckCircle, Clock, XCircle, 
  Search, FileSpreadsheet, Sparkles, Calendar
} from 'lucide-react'
import { format } from 'date-fns'

// ============================================================================
// Animated Stat Card Component
// ============================================================================
function AnimatedStatCard({ title, value, icon: Icon, color, delay = 0, subtitle }) {
  const colorClasses = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    gray: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  }
  
  const bgGradient = {
    emerald: 'from-emerald-500/5 to-transparent',
    blue: 'from-blue-500/5 to-transparent',
    amber: 'from-amber-500/5 to-transparent',
    rose: 'from-rose-500/5 to-transparent',
    gray: 'from-gray-500/5 to-transparent',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 100 }}
      className="h-full"
    >
      <Card className={`h-full relative overflow-hidden border ${colorClasses[color]} bg-gradient-to-br ${bgGradient[color]} hover:shadow-lg transition-all duration-300 group backdrop-blur-sm`}>
        <div className={`absolute top-0 right-0 w-24 h-24 ${colorClasses[color].split(' ')[1]} rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity`} />
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium ${colorClasses[color].split(' ')[0]} flex items-center gap-2`}>
            <div className={`p-1.5 rounded-lg ${colorClasses[color].split(' ')[1]}`}>
              <Icon size={14} />
            </div>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div 
            className="text-3xl font-bold text-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.2, type: 'spring', stiffness: 200 }}
          >
            {value}
          </motion.div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Main Participants Client Component
// ============================================================================
export default function ParticipantsClient({ 
  event, 
  participants: initialParticipants, 
  dynamicFields, 
  stats 
}) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const fixedHeaders = [
    { label: 'S.No', key: 'index', className: 'w-12' },
    { label: 'Registration Date', key: 'created_at', className: 'w-40' }
  ]

  const allHeaders = [...fixedHeaders, ...dynamicFields]

  // Filter participants based on search query
  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return initialParticipants
    
    return initialParticipants.filter(participant => {
      // Search through all response values
      if (participant.responses) {
        return Object.values(participant.responses).some(value => 
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      return false
    })
  }, [initialParticipants, searchQuery])

  const getParticipantResponseValue = (participant, field) => {
    if (!participant.responses || field.key === 'index' || field.key === 'created_at') {
      return 'N/A'
    }
    const value = participant.responses[field.key]
    
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return String(value)
  }

  const exportToCSV = async () => {
    if (filteredParticipants.length === 0) return
    
    setIsExporting(true)
    
    // Small delay for animation
    await new Promise(resolve => setTimeout(resolve, 300))

    const headers = allHeaders.map(h => `"${h.label}"`).join(',')
    
    const rows = filteredParticipants.map((participant, index) => {
      const fixedValues = [
        index + 1,
        `"${format(new Date(participant.created_at), 'MMM dd, yyyy')}"`
      ]
      
      const dynamicValues = dynamicFields.map(field => {
        const value = getParticipantResponseValue(participant, field)
        return `"${String(value).replace(/"/g, '""')}"`
      })
      
      return [...fixedValues, ...dynamicValues].join(',')
    })

    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${event?.title || 'participants'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setIsExporting(false)
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/admin/events/${event.id}/dashboard`)}
              className="hover:bg-muted"
            >
              <ArrowLeft size={20} />
            </Button>
          </motion.div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Users className="h-8 w-8 text-brand-red" />
                Participants
              </h1>
              <Badge variant="secondary" className="bg-brand-red/10 text-brand-red border-brand-red/20">
                {stats.approved} Approved
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{event?.title}</p>
          </div>
        </div>

        {filteredParticipants.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={exportToCSV}
              disabled={isExporting}
              className="bg-gradient-to-r from-brand-red to-purple-600 text-white font-semibold hover:opacity-90 transition-all shadow-lg shadow-brand-red/20"
            >
              {isExporting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <FileSpreadsheet size={18} className="mr-2" />
                </motion.div>
              ) : (
                <Download size={18} className="mr-2" />
              )}
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatedStatCard
          title="Total Registered"
          value={stats.total}
          icon={Users}
          color="gray"
          delay={0}
        />
        <AnimatedStatCard
          title="Approved"
          value={stats.approved}
          icon={CheckCircle}
          color="emerald"
          delay={0.1}
        />
        <AnimatedStatCard
          title="Pending"
          value={stats.pending}
          icon={Clock}
          color="amber"
          delay={0.2}
        />
        <AnimatedStatCard
          title="Rejected"
          value={stats.rejected}
          icon={XCircle}
          color="rose"
          delay={0.3}
        />
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-md">
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search participants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Participants Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {filteredParticipants.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              </motion.div>
              <h3 className="text-lg font-semibold text-muted-foreground">
                {searchQuery ? 'No participants match your search' : 'No approved participants yet'}
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchQuery ? 'Try adjusting your search query' : 'Participants will appear here once approved'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none bg-card/50 backdrop-blur-sm shadow-md overflow-hidden">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center justify-between">
                <span>Approved Registrations</span>
                <Badge variant="outline">{filteredParticipants.length} results</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/50">
                      {allHeaders.map((header) => (
                        <TableHead 
                          key={header.key} 
                          className={`${header.className} bg-muted/30 font-semibold text-foreground`}
                        >
                          {header.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredParticipants.map((participant, index) => (
                        <motion.tr
                          key={participant.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b border-border/30 hover:bg-muted/20 transition-colors group"
                        >
                          <TableCell className="w-12 font-medium text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="w-40">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-muted-foreground" />
                              {format(new Date(participant.created_at), 'MMM dd, yyyy')}
                            </div>
                          </TableCell>
                          {dynamicFields.map((field) => (
                            <TableCell key={field.key} className="group-hover:text-foreground transition-colors">
                              {getParticipantResponseValue(participant, field)}
                            </TableCell>
                          ))}
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
