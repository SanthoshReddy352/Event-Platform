'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import GradientText from '@/components/GradientText'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Link as LinkIcon, Loader2, AlertCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

function ClubProfileContent() {
  const { user, loading: authLoading } = useAuth()
  
  // --- DATA PERSISTENCE & STATE ---
  const storageKey = 'adminClubProfileForm';

  const [formData, setFormData] = useState(() => {
    if (typeof window === 'undefined') {
      return { 
        clubName: '', 
        clubLogoUrl: '', 
        mode: 'url',
        // API Keys (Replaces Bank Details)
        razorpayKeyId: '',
        razorpayKeySecret: ''
      };
    }
    const saved = window.sessionStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : { 
      clubName: '', 
      clubLogoUrl: '', 
      mode: 'url',
      razorpayKeyId: '',
      razorpayKeySecret: ''
    };
  });

  const [uploadFile, setUploadFile] = useState(null);
  
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !window.sessionStorage.getItem(storageKey);
  });

  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!user) return
    
    if (!window.sessionStorage.getItem(storageKey)) {
        setLoading(true)
    }

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      
      if (data) {
        // Only populate from DB if sessionStorage is empty to avoid overwriting unsaved edits
        const savedData = window.sessionStorage.getItem(storageKey);
        if (!savedData) {
          setFormData({
            clubName: data.club_name || '',
            clubLogoUrl: data.club_logo_url || '',
            mode: data.club_logo_url ? 'url' : 'upload',
            // Fetch Keys from DB
            razorpayKeyId: data.razorpay_key_id || '',
            razorpayKeySecret: data.razorpay_key_secret || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching club profile:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Save form data to session storage
  useEffect(() => {
    if (typeof window !== 'undefined' && !loading) {
      window.sessionStorage.setItem(storageKey, JSON.stringify(formData));
    }
  }, [formData, loading]);
  
  // File Upload Logic
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setUploadFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  })

  const handleUpload = async () => {
    if (!uploadFile) return null
    if (!user) throw new Error('User not found')

    const fileExt = uploadFile.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `club-logos/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('club-logos') 
      .upload(filePath, uploadFile, { upsert: true })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('club-logos')
      .getPublicUrl(filePath)
    
    return data.publicUrl
  }

  // --- SAVE PROFILE (Club + API Keys) ---
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    try {
      let finalLogoUrl = formData.clubLogoUrl;

      if (formData.mode === 'upload' && uploadFile) {
        finalLogoUrl = await handleUpload();
      }

      const updates = {
        club_name: formData.clubName,
        club_logo_url: finalLogoUrl,
        // Save Keys to DB
        razorpay_key_id: formData.razorpayKeyId,
        razorpay_key_secret: formData.razorpayKeySecret,
        updated_at: new Date().toISOString(),
      }
      
      const { error } = await supabase
        .from('admin_users')
        .update(updates)
        .eq('user_id', user.id)

      if (error) throw error
      
      alert('Profile updated successfully!')
      
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(storageKey);
      }
      setUploadFile(null); 
    } catch (error) {
      console.error('Error updating profile:', error)
      alert(`Failed to update profile: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-red" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-4xl font-bold mb-8">
        <GradientText>Club Profile & Payment Setup</GradientText>
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: CLUB DETAILS */}
        <Card>
          <CardHeader>
            <CardTitle>Club Identity</CardTitle>
            <CardDescription>
              Basic information shown on event pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="clubName">Club Name</Label>
              <Input
                id="clubName"
                value={formData.clubName}
                onChange={(e) => setFormData(prev => ({ ...prev, clubName: e.target.value }))}
                placeholder="e.g., IEEE Computer Society"
              />
            </div>

            <div className="space-y-2">
              <Label>Club Logo</Label>
              <div className="flex space-x-4 mb-4">
                <Button
                  type="button"
                  variant={formData.mode === 'url' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, mode: 'url' }))}
                  className={formData.mode === 'url' ? 'bg-brand-gradient text-white hover:opacity-90' : ''}
                >
                  <LinkIcon size={16} className="mr-2" />
                  Use URL
                </Button>
                <Button
                  type="button"
                  variant={formData.mode === 'upload' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, mode: 'upload' }))}
                  className={formData.mode === 'upload' ? 'bg-brand-gradient text-white hover:opacity-90' : ''}
                >
                  <Upload size={16} className="mr-2" />
                  Upload New
                </Button>
              </div>

              {formData.mode === 'url' ? (
                <div className="space-y-2">
                  <Label htmlFor="clubLogoUrl">Logo Image URL</Label>
                  <Input
                    id="clubLogoUrl"
                    value={formData.clubLogoUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, clubLogoUrl: e.target.value }))}
                    placeholder="https://example.com/logo.png"
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
                  {uploadFile ? (
                    <p className="text-sm">Selected: <strong>{uploadFile.name}</strong></p>
                  ) : (
                    <p className="text-sm text-gray-400">
                      {isDragActive ? 'Drop here' : 'Drag & drop or click to select new image'}
                    </p>
                  )}
                </div>
              )}
              
              {formData.clubLogoUrl && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-2">Current Logo Preview:</p>
                  <img src={formData.clubLogoUrl} alt="Club Logo" className="w-24 h-24 object-contain rounded-md border" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: PAYMENT CREDENTIALS */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Gateway (Razorpay)</CardTitle>
            <CardDescription>
              Enter your club's own Razorpay API Keys. Payment for your events will go directly to your Razorpay account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="keyId">Key ID</Label>
                <Input
                  id="keyId"
                  value={formData.razorpayKeyId}
                  onChange={(e) => setFormData(prev => ({ ...prev, razorpayKeyId: e.target.value }))}
                  placeholder="rzp_live_..."
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="keySecret">Key Secret</Label>
                <Input
                  id="keySecret"
                  type="password"
                  value={formData.razorpayKeySecret}
                  onChange={(e) => setFormData(prev => ({ ...prev, razorpayKeySecret: e.target.value }))}
                  placeholder="Enter your Key Secret"
                />
            </div>
            
            <Alert className="bg-blue-500/10 border-blue-500 text-blue-600">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>How to get keys?</AlertTitle>
                <AlertDescription>
                    1. Log in to your <a href="https://dashboard.razorpay.com/" target="_blank" className="underline font-bold">Razorpay Dashboard</a>.<br/>
                    2. Go to Settings &rarr; API Keys &rarr; Generate New Key.
                </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-brand-gradient text-white font-semibold w-full md:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? 'Saving Changes...' : 'Save All Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function ClubProfilePage() {
  return (
    <ProtectedRoute>
      <ClubProfileContent />
    </ProtectedRoute>
  )
}