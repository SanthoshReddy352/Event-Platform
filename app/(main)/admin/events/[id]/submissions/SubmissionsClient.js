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
  ArrowLeft, Download, FileText, Clock, 
  Search, FileSpreadsheet, Sparkles, ExternalLink, Mail, TrendingUp
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
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    gray: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  }
  
  const bgGradient = {
    emerald: 'from-emerald-500/5 to-transparent',
    blue: 'from-blue-500/5 to-transparent',
    amber: 'from-amber-500/5 to-transparent',
    purple: 'from-purple-500/5 to-transparent',
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
// Main Submissions Client Component
// ============================================================================
export default function SubmissionsClient({ 
  event, 
  submissions: initialSubmissions, 
  dynamicFields, 
  stats 
}) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const fixedHeaders = [
    { label: 'S.No', key: 'index', className: 'w-12' },
    { label: 'Submission Date', key: 'submitted_at', className: 'w-40' },
    { label: 'Email', key: 'participant_email', className: 'w-48' }
  ]

  const allHeaders = [...fixedHeaders, ...dynamicFields]

  // Filter submissions based on search query
  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return initialSubmissions
    
    const query = searchQuery.toLowerCase()
    return initialSubmissions.filter(submission => {
      // Search through email
      if (submission.participant_email?.toLowerCase().includes(query)) return true
      
      // Search through submission data
      if (submission.submission_data) {
        return Object.values(submission.submission_data).some(value => 
          String(value).toLowerCase().includes(query)
        )
      }
      return false
    })
  }, [initialSubmissions, searchQuery])

  const getSubmissionValue = (participant, field) => {
    if (!participant.submission_data || field.key === 'index' || field.key === 'submitted_at' || field.key === 'participant_email') {
      return 'N/A'
    }
    const value = participant.submission_data[field.key]
    
    if (value === null || value === undefined) return 'N/A'
    
    // Handle URLs
    if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('www'))) {
      return (
        <a 
          href={value.startsWith('www') ? `https://${value}` : value} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 hover:underline transition-colors"
        >
          <ExternalLink size={14} />
          <span>View Link</span>
        </a>
      )
    }

    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return String(value)
  }

  const getCSVValue = (participant, field) => {
    if (!participant.submission_data) return 'N/A'
    const value = participant.submission_data[field.key]
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return String(value)
  }

  const exportToCSV = async () => {
    if (filteredSubmissions.length === 0) return
    
    setIsExporting(true)
    
    // Small delay for animation
    await new Promise(resolve => setTimeout(resolve, 300))

    const headers = allHeaders.map(h => `"${h.label}"`).join(',')
    
    const rows = filteredSubmissions.map((participant, index) => {
      const fixedValues = [
        index + 1,
        `"${format(new Date(participant.submitted_at), 'MMM dd, yyyy HH:mm')}"`,
        `"${participant.participant_email || 'N/A'}"`
      ]
      
      const dynamicValues = dynamicFields.map(field => {
        const value = getCSVValue(participant, field)
        return `"${String(value).replace(/"/g, '""')}"`
      })
      
      return [...fixedValues, ...dynamicValues].join(',')
    })

    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${event?.title || 'submissions'}_submissions.csv`)
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
                <FileText className="h-8 w-8 text-purple-500" />
                Project Submissions
              </h1>
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                {stats.total} Total
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{event?.title}</p>
          </div>
        </div>

        {filteredSubmissions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={exportToCSV}
              disabled={isExporting}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
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
      <div className="grid grid-cols-2 gap-4">
        <AnimatedStatCard
          title="Total Submissions"
          value={stats.total}
          icon={FileText}
          color="purple"
          delay={0}
        />
        <AnimatedStatCard
          title="Last 24 Hours"
          value={stats.recent24h}
          icon={TrendingUp}
          color="emerald"
          delay={0.1}
          subtitle="Recent activity"
        />
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-md">
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search by email or submission data..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Submissions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {filteredSubmissions.length === 0 ? (
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
                {searchQuery ? 'No submissions match your search' : 'No submissions received yet'}
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchQuery ? 'Try adjusting your search query' : 'Project submissions will appear here once received'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none bg-card/50 backdrop-blur-sm shadow-md overflow-hidden">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center justify-between">
                <span>All Submissions</span>
                <Badge variant="outline">{filteredSubmissions.length} results</Badge>
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
                      {filteredSubmissions.map((submission, index) => (
                        <motion.tr
                          key={submission.id}
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
                              <Clock size={14} className="text-muted-foreground" />
                              {format(new Date(submission.submitted_at), 'MMM dd, HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell className="w-48">
                            <div className="flex items-center gap-2">
                              <Mail size={14} className="text-muted-foreground" />
                              <span className="truncate max-w-[180px]">
                                {submission.participant_email || 'N/A'}
                              </span>
                            </div>
                          </TableCell>
                          {dynamicFields.map((field) => (
                            <TableCell key={field.key} className="group-hover:text-foreground transition-colors">
                              {getSubmissionValue(submission, field)}
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
