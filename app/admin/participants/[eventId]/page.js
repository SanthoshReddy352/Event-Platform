'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Download } from 'lucide-react'

function ParticipantsContent() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.eventId) {
      fetchData()
    }
  }, [params.eventId])

  const fetchData = async () => {
    try {
      const [eventRes, participantsRes] = await Promise.all([
        fetch(`/api/events/${params.eventId}`),
        fetch(`/api/participants/${params.eventId}`),
      ])

      const eventData = await eventRes.json()
      const participantsData = await participantsRes.json()

      if (eventData.success) setEvent(eventData.event)
      if (participantsData.success) setParticipants(participantsData.participants)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (participants.length === 0) {
      alert('No participants to export')
      return
    }

    // Get all unique field names
    const fieldNames = new Set()
    participants.forEach((p) => {
      Object.keys(p.responses).forEach((key) => fieldNames.add(key))
    })

    const headers = ['ID', 'Registration Date', ...Array.from(fieldNames)]
    const rows = participants.map((p) => {
      const row = [
        p.id,
        new Date(p.created_at).toLocaleString(),
      ]
      fieldNames.forEach((field) => {
        row.push(p.responses[field] || '')
      })
      return row
    })

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event?.title || 'event'}-participants.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00629B]"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Button
        variant="ghost"
        onClick={() => router.push('/admin/events')}
        className="mb-4"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Events
      </Button>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Participants</h1>
          <p className="text-gray-600 mt-2">{event?.title}</p>
        </div>
        {participants.length > 0 && (
          <Button
            onClick={exportToCSV}
            className="bg-[#00629B] hover:bg-[#004d7a]"
          >
            <Download size={20} className="mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {participants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>No participants yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Total Registrations: {participants.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Responses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant, index) => (
                    <TableRow key={participant.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {new Date(participant.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {Object.entries(participant.responses).map(
                            ([key, value]) => (
                              <div key={key} className="text-sm">
                                <span className="font-semibold">{key}:</span>{' '}
                                {typeof value === 'boolean'
                                  ? value
                                    ? 'Yes'
                                    : 'No'
                                  : value}
                              </div>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function ParticipantsPage() {
  return (
    <ProtectedRoute>
      <ParticipantsContent />
    </ProtectedRoute>
  )
}
