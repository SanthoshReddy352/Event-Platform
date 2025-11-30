'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Upload, Link as LinkIcon, ArrowLeft, Loader2, IndianRupee } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext' 
import LastWordGradientText from '@/components/LastWordGradientText'

// Helper to convert datetime-local string (from input) to ISO format (UTC)
const toISOString = (dateTimeLocalString) => {
    if (!dateTimeLocalString) return null;
    return new Date(dateTimeLocalString).toISOString();
}

// Helper to convert ISO string (from DB) to datetime-local format for inputs
const formatDateTimeLocal = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  // Adjust for local timezone offset to display correctly in input
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return localDate.toISOString().slice(0, 16);
}

function EditEventContent() {
  const router = useRouter()
  const params = useParams()
  const { id } = params
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    event_end_date: '',
    is_active: false,
    registration_open: true,
    registration_start: '',
    registration_end: '',
    banner_url: '',
    is_paid: false,
    registration_fee: 0,
  });
  
  const [bannerMode, setBannerMode] = useState('url')
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerFile, setBannerFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState('');

  const { loading: authLoading } = useAuth()

  // Fetch Event Data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      
      try {
        const response = await fetch(`/api/events/${id}`);
        const data = await response.json();
        
        if (data.success && data.event) {
          const e = data.event;
          setFormData({
            title: e.title || '',
            description: e.description || '',
            event_date: formatDateTimeLocal(e.event_date),
            event_end_date: formatDateTimeLocal(e.event_end_date),
            is_active: e.is_active,
            registration_open: e.registration_open,
            registration_start: formatDateTimeLocal(e.registration_start),
            registration_end: formatDateTimeLocal(e.registration_end),
            banner_url: e.banner_url || '',
            is_paid: e.is_paid || false,
            registration_fee: e.registration_fee || 0,
          });
          
          if (e.banner_url) {
            setBannerUrl(e.banner_url);
            setPreviewUrl(e.banner_url);
            setBannerMode('url');
          }
        } else {
            alert('Failed to fetch event details');
            router.push('/admin/events');
        }
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, router]);

  // Effect to update preview URL
  useEffect(() => {
    let objectUrl = null; 

    if (bannerMode === 'url') {
      setPreviewUrl(bannerUrl);
    } else if (bannerMode === 'upload' && bannerFile) {
      objectUrl = URL.createObjectURL(bannerFile);
      setPreviewUrl(objectUrl);
    } 

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [bannerUrl, bannerFile, bannerMode]);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setBannerFile(acceptedFiles[0])
      setBannerMode('upload')
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
      let finalBannerUrl = formData.banner_url

      if (bannerMode === 'upload' && bannerFile) {
        finalBannerUrl = await uploadBanner()
      } else if (bannerMode === 'url') {
        finalBannerUrl = bannerUrl
      }

      const eventData = {
        ...formData,
        banner_url: finalBannerUrl,
        event_date: toISOString(formData.event_date),
        event_end_date: toISOString(formData.event_end_date),
        registration_start: toISOString(formData.registration_start),
        registration_end: toISOString(formData.registration_end),
        registration_fee: formData.is_paid ? parseFloat(formData.registration_fee) : 0,
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      // Changed method to PUT and URL to specific ID
      const response = await fetch(`/api/events/${id}`, {
        method: 'PUT',
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

  if (authLoading || loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red" />
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
      
      <h1 className="text-4xl font-bold mb-8"><LastWordGradientText>Edit Event</LastWordGradientText></h1>

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
            
            {/* Payment Section */}
            <div className="p-4 border rounded-lg bg-gray-50/10 space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_paid"
                    checked={formData.is_paid}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked })}
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
                        type="number"
                        min="0"
                        className="pl-9"
                        value={formData.registration_fee}
                        onChange={(e) => setFormData({ ...formData, registration_fee: e.target.value })}
                        required={formData.is_paid}
                      />
                    </div>
                  </div>
                )}
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

            {previewUrl && (
              <div className="mt-4">
                <Label>Banner Preview</Label>
                <div className="mt-2 aspect-video w-full overflow-hidden rounded-lg border bg-gray-900">
                  <img
                    src={previewUrl}
                    alt="Event Banner Preview"
                    className="h-full w-full object-contain"
                  />
                </div>
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

export default function EditEventPage() {
  return (
    <ProtectedRoute>
      <EditEventContent />
    </ProtectedRoute>
  )
}