'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Upload, Link as LinkIcon, ArrowLeft, Loader2 } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext' 

// Helper to convert datetime-local string (from input) to ISO format (UTC)
const toISOString = (dateTimeLocalString) => {
    if (!dateTimeLocalString) return null;
    return new Date(dateTimeLocalString).toISOString();
}

// Helper to convert ISO string (from DB) to datetime-local string (for input)
const fromISOString = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    // Adjust for local timezone for the input
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}


function EditEventContent() {
  const router = useRouter()
  const params = useParams()
  const { id } = params // Get the event ID from the URL

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    event_end_date: '',
    is_active: false,
    registration_open: true,
    registration_start: '',
    registration_end: '',
    banner_url: '', // This will be set from the fetched event
  });
  
  const [bannerMode, setBannerMode] = useState('url')
  const [bannerUrl, setBannerUrl] = useState(''); // For the URL input
  const [bannerFile, setBannerFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true) // For fetching data
  
  const { loading: authLoading } = useAuth()

  // --- MODIFICATION: Fetch existing event data ---
  useEffect(() => {
    if (!id) return;

    const fetchEvent = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/events/${id}`);
        const data = await response.json();

        if (data.success && data.event) {
          const event = data.event;
          // Populate the form with fetched data
          setFormData({
            title: event.title || '',
            description: event.description || '',
            event_date: fromISOString(event.event_date),
            event_end_date: fromISOString(event.event_end_date),
            is_active: event.is_active || false,
            registration_open: event.registration_open || false,
            registration_start: fromISOString(event.registration_start),
            registration_end: fromISOString(event.registration_end),
            banner_url: event.banner_url || '', // Keep track of original
          });
          // Set the banner URL for the input field
          setBannerUrl(event.banner_url || '');
          if (event.banner_url) {
            setBannerMode('url');
          }
        } else {
          alert('Error: Could not find event data.');
          router.push('/admin/events');
        }
      } catch (error) {
        console.error('Failed to fetch event:', error);
        alert('An error occurred while fetching event data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [id, router]);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setBannerFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  })

  const uploadBanner = async () => {
    if (!bannerFile) return null

    const fileExt = bannerFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${fileName}`

    const { data, error } = await supabase.storage
      .from('event-banners')
      .upload(filePath, bannerFile)

    if (error) {
      console.error('Upload error:', error)
      throw error
    }

    const { data: { publicUrl } } = supabase.storage
      .from('event-banners')
      .getPublicUrl(filePath)

    return publicUrl
  }

  // --- MODIFICATION: Handle SUBMIT for UPDATE ---
  const handleSubmit = async (e) => {
    e.preventDefault()

    // --- Validation ---
    if (formData.event_end_date && formData.event_date && new Date(formData.event_end_date) < new Date(formData.event_date)) {
        alert('Event end date cannot be before the event start date.');
        return;
    }
    if (formData.registration_end && formData.registration_start && new Date(formData.registration_end) < new Date(formData.registration_start)) {
        alert('Registration end date cannot be before the registration start date.');
        return;
    }
    // --- END OF VALIDATION ---

    setIsSubmitting(true)

    try {
      let finalBannerUrl = formData.banner_url; // Default to existing URL

      if (bannerMode === 'upload' && bannerFile) {
        // Upload new banner
        finalBannerUrl = await uploadBanner()
      } else if (bannerMode === 'url') {
        // Use the URL from the text input
        finalBannerUrl = bannerUrl
      }

      // We don't send form_fields here, as that's handled by the form-builder page
      // We only update the core event details
      const eventData = {
        title: formData.title,
        description: formData.description,
        banner_url: finalBannerUrl,
        event_date: toISOString(formData.event_date),
        event_end_date: toISOString(formData.event_end_date),
        registration_start: toISOString(formData.registration_start),
        registration_end: toISOString(formData.registration_end),
        is_active: formData.is_active,
        registration_open: formData.registration_open,
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/events/${id}`, { // Use ID in URL
        method: 'PUT', // Use PUT for update
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(eventData),
      })

      const data = await response.json()
      if (data.success) {
        alert('Event updated successfully!')
        router.push('/admin/events')
      } else {
        alert(`Failed to update event: ${data.error}`) 
        console.error('API Error:', data.error);
      }
    } catch (error) {
      console.error('Error updating event:', error)
      alert('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="inline-block animate-spin rounded-full h-12 w-12 text-brand-red" />
        <p className="mt-4 text-gray-400">Loading Event Data...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => router.push('/admin/events')}
        className="mb-4"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Events
      </Button>
      
      <h1 className="text-4xl font-bold mb-8">Edit Event</h1>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_date">Event Start Date & Time</Label>
                <Input
                  id="event_date"
                  type="datetime-local"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="custom-date-icon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_end_date">Event End Date & Time</Label>
                <Input
                  id="event_end_date"
                  type="datetime-local"
                  value={formData.event_end_date}
                  onChange={(e) => setFormData({ ...formData, event_end_date: e.target.value })}
                  className="custom-date-icon"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registration_start">Registration Start Date & Time</Label>
                <Input
                  id="registration_start"
                  type="datetime-local"
                  value={formData.registration_start}
                  onChange={(e) => setFormData({ ...formData, registration_start: e.target.value })}
                  className="custom-date-icon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registration_end">Registration End Date & Time</Label>
                <Input
                  id="registration_end"
                  type="datetime-local"
                  value={formData.registration_end}
                  onChange={(e) => setFormData({ ...formData, registration_end: e.target.value })}
                  className="custom-date-icon"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active" className="font-normal">
                Event is Active (Publicly Visible)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="registration_open"
                checked={formData.registration_open}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, registration_open: checked })
                }
              />
              <Label htmlFor="registration_open" className="font-normal">
                Registration is Open
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Event Banner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4 mb-4">
              <Button
                type="button"
                variant={bannerMode === 'url' ? 'default' : 'outline'}
                onClick={() => setBannerMode('url')}
                className={bannerMode === 'url' ? 'bg-brand-gradient text-white hover:opacity-90' : ''}
              >
                <LinkIcon size={16} className="mr-2" />
                Use URL
              </Button>
              <Button
                type="button"
                variant={bannerMode === 'upload' ? 'default' : 'outline'}
                onClick={() => setBannerMode('upload')}
                className={bannerMode === 'upload' ? 'bg-brand-gradient text-white hover:opacity-90' : ''}
              >
                <Upload size={16} className="mr-2" />
                Upload New
              </Button>
            </div>

            {bannerMode === 'url' ? (
              <div className="space-y-2">
                <Label htmlFor="banner_url">Banner URL</Label>
                <Input
                  id="banner_url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                />
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
                  isDragActive ? 'border-brand-red bg-red-900/10' : 'border-gray-600'
                }`}
              >
                <input {...getInputProps()} />
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                {bannerFile ? (
                  <p className="text-sm">Selected: <strong>{bannerFile.name}</strong></p>
                ) : (
                  <p className="text-sm text-gray-400">
                    {isDragActive ? 'Drop here' : 'Drag & drop or click to select new image'}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Event'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

// We must wrap the default export in Suspense to allow useParams()
export default function EditEventPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="text-center py-12">
          <Loader2 className="inline-block animate-spin rounded-full h-12 w-12 text-brand-red" />
        </div>
      }>
        <EditEventContent />
      </Suspense>
    </ProtectedRoute>
  )
}