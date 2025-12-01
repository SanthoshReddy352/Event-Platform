'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, IndianRupee, Clock } from 'lucide-react'

// Helper to check if a date is valid
const isValidDate = (d) => d instanceof Date && !isNaN(d);

// Helper to format Date object to "YYYY-MM-DDTHH:mm" for datetime-local input
const toDateTimeLocal = (date) => {
  if (!date || !isValidDate(date)) return '';
  const pad = (num) => num.toString().padStart(2, '0');
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    'T' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes())
  );
};

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
    is_paid: false,
    registration_fee: 0,
    // Scope Fields
    event_type: 'other',
    // Hackathon Specifics
    problem_selection_start: null,
    problem_selection_end: null,
    ppt_template_url: '',
    ppt_release_time: null,
    submission_start: null,
    submission_end: null,
  })

  // When initialData is provided (for editing), populate the form state
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        banner_url: initialData.banner_url || '',
        
        // Convert ISO strings to Date objects
        event_date: initialData.event_date ? new Date(initialData.event_date) : null,
        event_end_date: initialData.event_end_date ? new Date(initialData.event_end_date) : null,
        registration_start: initialData.registration_start ? new Date(initialData.registration_start) : null,
        registration_end: initialData.registration_end ? new Date(initialData.registration_end) : null,
        
        is_active: initialData.is_active || false,
        registration_open: initialData.registration_open || false,
        is_paid: initialData.is_paid || false,
        registration_fee: initialData.registration_fee || 0,
        
        // New Fields
        event_type: initialData.event_type || 'other',
        problem_selection_start: initialData.problem_selection_start ? new Date(initialData.problem_selection_start) : null,
        problem_selection_end: initialData.problem_selection_end ? new Date(initialData.problem_selection_end) : null,
        ppt_template_url: initialData.ppt_template_url || '',
        ppt_release_time: initialData.ppt_release_time ? new Date(initialData.ppt_release_time) : null,
        submission_start: initialData.submission_start ? new Date(initialData.submission_start) : null,
        submission_end: initialData.submission_end ? new Date(initialData.submission_end) : null,
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

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle datetime-local input changes
  const handleDateTimeLocalChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value ? new Date(value) : null,
    }));
  };

  const handleSwitchChange = (field, checked) => {
    setFormData((prev) => ({
      ...prev,
      [field]: checked,
    }))
  }

  const validateForm = () => {
    const {
      event_date,
      event_end_date,
      registration_start,
      registration_end,
      problem_selection_start,
      problem_selection_end,
      submission_start,
      submission_end
    } = formData;

    if (event_date && event_end_date && event_date >= event_end_date) {
      alert("Event Start Date must be before Event End Date.");
      return false;
    }

    if (registration_start && registration_end && registration_start >= registration_end) {
      alert("Registration Start Date must be before Registration End Date.");
      return false;
    }

    // Registration should generally end before the event ends
    if (registration_end && event_end_date && registration_end > event_end_date) {
      alert("Registration cannot end after the event has ended.");
      return false;
    }

    if (formData.event_type === 'hackathon') {
       if (problem_selection_start && problem_selection_end && problem_selection_start >= problem_selection_end) {
          alert("Problem Selection Start must be before Problem Selection End.");
          return false;
       }
       if (submission_start && submission_end && submission_start >= submission_end) {
          alert("Submission Start must be before Submission End.");
          return false;
       }
    }

    return true;
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validateForm()) return;

    // Convert Date objects back to ISO strings for the database
    const submissionData = {
      ...formData,
      event_date: isValidDate(formData.event_date) ? formData.event_date.toISOString() : null,
      event_end_date: isValidDate(formData.event_end_date) ? formData.event_end_date.toISOString() : null,
      registration_start: isValidDate(formData.registration_start) ? formData.registration_start.toISOString() : null,
      registration_end: isValidDate(formData.registration_end) ? formData.registration_end.toISOString() : null,
      
      // Hackathon Dates
      problem_selection_start: isValidDate(formData.problem_selection_start) ? formData.problem_selection_start.toISOString() : null,
      problem_selection_end: isValidDate(formData.problem_selection_end) ? formData.problem_selection_end.toISOString() : null,
      ppt_release_time: isValidDate(formData.ppt_release_time) ? formData.ppt_release_time.toISOString() : null,
      submission_start: isValidDate(formData.submission_start) ? formData.submission_start.toISOString() : null,
      submission_end: isValidDate(formData.submission_end) ? formData.submission_end.toISOString() : null,

      // Ensure fee is a number
      registration_fee: formData.is_paid ? parseFloat(formData.registration_fee) : 0,
    }
    
    onSubmit(submissionData)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{initialData ? 'Edit Event' : 'Create New Event'}</CardTitle>
          <CardDescription>
            {initialData ? 'Update the details for your event.' : 'Fill in the details for your new event.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* 1. Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Basic Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor="event_type">Event Type</Label>
                    <Select 
                        value={formData.event_type} 
                        onValueChange={(value) => handleSelectChange('event_type', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="other">Standard Event (Workshop/Seminar)</SelectItem>
                            <SelectItem value="hackathon">Hackathon</SelectItem>
                            <SelectItem value="mcq">MCQ Quiz</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
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
          </div>

          {/* 2. Registration & Schedule (UPDATED WITH TIME) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Schedule & Registration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Event Start Date */}
                <div className="space-y-2">
                    <Label>Event Start Date & Time</Label>
                    <Input 
                        type="datetime-local"
                        name="event_date"
                        value={toDateTimeLocal(formData.event_date)}
                        onChange={handleDateTimeLocalChange}
                        required
                    />
                </div>

                {/* Event End Date */}
                <div className="space-y-2">
                    <Label>Event End Date & Time</Label>
                    <Input 
                        type="datetime-local"
                        name="event_end_date"
                        value={toDateTimeLocal(formData.event_end_date)}
                        onChange={handleDateTimeLocalChange}
                    />
                </div>

                {/* Registration Start Date */}
                <div className="space-y-2">
                    <Label>Registration Start</Label>
                    <Input 
                        type="datetime-local"
                        name="registration_start"
                        value={toDateTimeLocal(formData.registration_start)}
                        onChange={handleDateTimeLocalChange}
                    />
                </div>

                {/* Registration End Date */}
                <div className="space-y-2">
                    <Label>Registration End</Label>
                    <Input 
                        type="datetime-local"
                        name="registration_end"
                        value={toDateTimeLocal(formData.registration_end)}
                        onChange={handleDateTimeLocalChange}
                    />
                </div>
            </div>
          </div>

          {/* 3. HACKATHON SPECIFIC SETTINGS */}
          {formData.event_type === 'hackathon' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 bg-brand-red/5 p-4 rounded-lg border border-brand-red/20">
                  <div className="flex items-center gap-2 border-b border-brand-red/20 pb-2">
                    <Clock className="text-brand-red h-5 w-5" />
                    <h3 className="text-lg font-semibold text-brand-red">Hackathon Scope Config</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Problem Statement Section */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-500">Problem Statement Selection Window</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">Opens At</Label>
                                <Input 
                                    type="datetime-local" 
                                    name="problem_selection_start"
                                    value={toDateTimeLocal(formData.problem_selection_start)}
                                    onChange={handleDateTimeLocalChange}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Closes At</Label>
                                <Input 
                                    type="datetime-local" 
                                    name="problem_selection_end"
                                    value={toDateTimeLocal(formData.problem_selection_end)}
                                    onChange={handleDateTimeLocalChange}
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400">Participants can only choose problems between these times.</p>
                    </div>

                    {/* PPT Section */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-500">PPT Round</Label>
                        <div className="space-y-2">
                             <div className="space-y-1">
                                <Label className="text-xs">Release Template At</Label>
                                <Input 
                                    type="datetime-local" 
                                    name="ppt_release_time"
                                    value={toDateTimeLocal(formData.ppt_release_time)}
                                    onChange={handleDateTimeLocalChange}
                                />
                             </div>
                             <div className="space-y-1">
                                <Label className="text-xs">PPT Template URL (Optional)</Label>
                                <Input 
                                    name="ppt_template_url"
                                    placeholder="https://drive.google.com/..."
                                    value={formData.ppt_template_url}
                                    onChange={handleChange}
                                />
                             </div>
                        </div>
                    </div>

                    {/* Final Submission Section */}
                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold uppercase text-gray-500">Final Project Submission Window</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">Opens At</Label>
                                <Input 
                                    type="datetime-local" 
                                    name="submission_start"
                                    value={toDateTimeLocal(formData.submission_start)}
                                    onChange={handleDateTimeLocalChange}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Closes At</Label>
                                <Input 
                                    type="datetime-local" 
                                    name="submission_end"
                                    value={toDateTimeLocal(formData.submission_end)}
                                    onChange={handleDateTimeLocalChange}
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400">The submission form will only be visible during this window.</p>
                    </div>
                </div>
             </div>
          )}


          {/* 4. Settings */}
          <div className="p-4 border rounded-lg bg-gray-50/10 space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Settings</h3>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_paid"
                checked={formData.is_paid}
                onCheckedChange={(checked) => handleSwitchChange('is_paid', checked)}
              />
              <Label htmlFor="is_paid" className="font-semibold text-brand-red">Is this a Paid Event?</Label>
            </div>

            {formData.is_paid && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="registration_fee">Registration Fee (INR)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    id="registration_fee"
                    name="registration_fee"
                    type="number"
                    min="0"
                    className="pl-9"
                    value={formData.registration_fee}
                    onChange={handleChange}
                    required={formData.is_paid}
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-4 pt-4">
                <div className="flex items-center space-x-2">
                <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Event Active (Public)</Label>
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