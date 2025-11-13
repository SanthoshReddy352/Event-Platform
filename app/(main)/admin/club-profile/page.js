'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import GradientText from '@/components/GradientText'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Link as LinkIcon, Loader2 } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext' 

function ClubProfileContent() {
  const { user, loading: authLoading } = useAuth()
  
  // --- START OF DATA PERSISTENCE ---
  const storageKey = 'adminClubProfileForm';

  const [formData, setFormData] = useState(() => {
    if (typeof window === 'undefined') {
      return { clubName: '', clubLogoUrl: '', mode: 'url' };
    }
    const saved = window.sessionStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : { clubName: '', clubLogoUrl: '', mode: 'url' };
  });

  const [uploadFile, setUploadFile] = useState(null); // File object can't be stored
  // --- END OF DATA PERSISTENCE ---

  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [adminRecord, setAdminRecord] = useState(null)

  const fetchProfile = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      
      if (data) {
        setAdminRecord(data)
        
        // --- START OF DATA PERSISTENCE ---
        // Only set from DB if session storage is empty
        const savedData = window.sessionStorage.getItem(storageKey);
        if (!savedData) {
          setFormData({
            clubName: data.club_name || '',
            clubLogoUrl: data.club_logo_url || '',
            mode: data.club_logo_url ? 'url' : 'upload',
          });
        }
        // --- END OF DATA PERSISTENCE ---
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

  // --- START OF DATA PERSISTENCE ---
  // Save form data to session storage on change
  useEffect(() => {
    if (typeof window !== 'undefined' && !loading) {
      window.sessionStorage.setItem(storageKey, JSON.stringify(formData));
    }
  }, [formData, loading]);
  // --- END OF DATA PERSISTENCE ---
  
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
      .from('event-banners') // Assuming you store logos here
      .upload(filePath, uploadFile, { upsert: true })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('event-banners')
      .getPublicUrl(filePath)
    
    return data.publicUrl
  }

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
        updated_at: new Date().toISOString(),
      }
      
      const { error } = await supabase
        .from('admin_users')
        .update(updates)
        .eq('user_id', user.id)

      if (error) throw error
      
      alert('Profile updated successfully!')
      
      // --- START OF DATA PERSISTENCE ---
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(storageKey);
      }
      // --- END OF DATA PERSISTENCE ---

      setUploadFile(null); // Clear file
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
        <GradientText>Club Profile</GradientText>
      </h1>
      <p className="text-gray-400 mb-6">
        This information will be shown to users on your event pages.
      </p>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Your Club Details</CardTitle>
            <CardDescription>
              Logged in as: {user?.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="clubName">Club Name</Label>
              <Input
                id="clubName"
                value={formData.clubName}
                // --- START OF DATA PERSISTENCE ---
                onChange={(e) => setFormData(prev => ({ ...prev, clubName: e.target.value }))}
                // --- END OF DATA PERSISTENCE ---
                placeholder="e.g., IEEE Computer Society"
              />
            </div>

            <div className="space-y-2">
              <Label>Club Logo</Label>
              <div className="flex space-x-4 mb-4">
                <Button
                  type="button"
                  variant={formData.mode === 'url' ? 'default' : 'outline'}
                  // --- START OF DATA PERSISTENCE ---
                  onClick={() => setFormData(prev => ({ ...prev, mode: 'url' }))}
                  className={formData.mode === 'url' ? 'bg-brand-gradient text-white hover:opacity-90' : ''}
                  // --- END OF DATA PERSISTENCE ---
                >
                  <LinkIcon size={16} className="mr-2" />
                  Use URL
                </Button>
                <Button
                  type="button"
                  variant={formData.mode === 'upload' ? 'default' : 'outline'}
                  // --- START OF DATA PERSISTENCE ---
                  onClick={() => setFormData(prev => ({ ...prev, mode: 'upload' }))}
                  className={formData.mode === 'upload' ? 'bg-brand-gradient text-white hover:opacity-90' : ''}
                  // --- END OF DATA PERSISTENCE ---
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
                    // --- START OF DATA PERSISTENCE ---
                    onChange={(e) => setFormData(prev => ({ ...prev, clubLogoUrl: e.target.value }))}
                    // --- END OF DATA PERSISTENCE ---
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
            
            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isSubmitting ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>

          </CardContent>
        </Card>
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