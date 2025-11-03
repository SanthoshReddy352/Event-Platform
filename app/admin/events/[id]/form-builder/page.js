'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import FormBuilder from '@/components/FormBuilder'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

function FormBuilderContent() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchEvent()
    }
  }, [params.id])

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${params.id}`)
      const data = await response.json()
      if (data.success) {
        setEvent(data.event)
      }
    } catch (error) {
      console.error('Error fetching event:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (fields) => {
    try {
      const response = await fetch(`/api/events/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_fields: fields,
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Form saved successfully!')
        router.push('/admin/events')
      } else {
        alert('Failed to save form')
      }
    } catch (error) {
      console.error('Error saving form:', error)
      alert('An error occurred')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00629B]"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p>Event not found</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => router.push('/admin/events')}
        className="mb-4"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Events
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Build Registration Form</h1>
        <p className="text-gray-600">for {event.title}</p>
      </div>

      <FormBuilder
        initialFields={event.form_fields || []}
        onSave={handleSave}
      />
    </div>
  )
}

export default function FormBuilderPage() {
  return (
    <ProtectedRoute>
      <FormBuilderContent />
    </ProtectedRoute>
  )
}
