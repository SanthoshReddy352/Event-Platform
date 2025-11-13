'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

// Helper to check if a date is valid
const isValidDate = (d) => d instanceof Date && !isNaN(d);

export default function EventForm({ onSubmit, initialData = null, isSubmitting = false }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    banner_url: '',
    event_date: null,
    event_end_date: null,
    registration_start: null,
    registration_end: null,
    is_active: false,
    registration_open: false,
  })

  // When initialData is provided (for editing), populate the form state
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        banner_url: initialData.banner_url || '',
        // Convert ISO date strings back into Date objects for the calendar
        event_date: initialData.event_date ? new Date(initialData.event_date) : null,
        event_end_date: initialData.event_end_date ? new Date(initialData.event_end_date) : null,
        registration_start: initialData.registration_start ? new Date(initialData.registration_start) : null,
        registration_end: initialData.registration_end ? new Date(initialData.registration_end) : null,
        is_active: initialData.is_active || false,
        registration_open: initialData.registration_open || false,
      })
    }
  }, [initialData])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleDateChange = (field, date) => {
    setFormData((prev) => ({
      ...prev,
      [field]: date,
    }))
  }

  const handleSwitchChange = (field, checked) => {
    setFormData((prev) => ({
      ...prev,
      [field]: checked,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Convert Date objects back to ISO strings for the database
    const submissionData = {
      ...formData,
      event_date: isValidDate(formData.event_date) ? formData.event_date.toISOString() : null,
      event_end_date: isValidDate(formData.event_end_date) ? formData.event_end_date.toISOString() : null,
      registration_start: isValidDate(formData.registration_start) ? formData.registration_start.toISOString() : null,
      registration_end: isValidDate(formData.registration_end) ? formData.registration_end.toISOString() : null,
    }
    
    onSubmit(submissionData)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{initialData ? 'Edit Event' : 'Create New Event'}</CardTitle>
          <CardDescription>
            {initialData ? 'Update the details for your event.' : 'Fill in the details for your new event.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="My Awesome Hackathon"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your event..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner_url">Banner Image URL</Label>
            <Input
              id="banner_url"
              name="banner_url"
              value={formData.banner_url}
              onChange={handleChange}
              placeholder="https://example.com/my-banner.png"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Event Start Date */}
            <div className="space-y-2">
              <Label>Event Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {isValidDate(formData.event_date)
                      ? format(formData.event_date, 'PPP')
                      : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.event_date}
                    onSelect={(date) => handleDateChange('event_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Event End Date */}
            <div className="space-y-2">
              <Label>Event End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {isValidDate(formData.event_end_date)
                      ? format(formData.event_end_date, 'PPP')
                      : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.event_end_date}
                    onSelect={(date) => handleDateChange('event_end_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Registration Start Date */}
            <div className="space-y-2">
              <Label>Registration Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {isValidDate(formData.registration_start)
                      ? format(formData.registration_start, 'PPP')
                      : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.registration_start}
                    onSelect={(date) => handleDateChange('registration_start', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Registration End Date */}
            <div className="space-y-2">
              <Label>Registration End</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {isValidDate(formData.registration_end)
                      ? format(formData.registration_end, 'PPP')
                      : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.registration_end}
                    onSelect={(date) => handleDateChange('registration_end', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
              />
              <Label htmlFor="is_active">Event Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="registration_open"
                checked={formData.registration_open}
                onCheckedChange={(checked) => handleSwitchChange('registration_open', checked)}
              />
              <Label htmlFor="registration_open">Registration Open</Label>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {initialData ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}