'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import GradientText from '@/components/GradientText'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Upload, ArrowLeft, Loader2 } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

function ClubProfileContent() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [clubName, setClubName] = useState('')
  const [logoUrl, setLogoUrl] = useState('') // For preview
  const [logoFile, setLogoFile] = useState(null)
  const [initialLogoUrl, setInitialLogoUrl] = useState('')

  // Fetch existing profile data
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('club_name, club_logo_url')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setClubName(data.club_name || '');
        setLogoUrl(data.club_logo_url || '');
        setInitialLogoUrl(data.club_logo_url || '');
      }
    } catch (error) {
      console.error("Error fetching club profile:", error);
      alert("Error fetching profile: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // Depend on user.id

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setLogoFile(file);
      setLogoUrl(URL.createObjectURL(file)); // Show local preview
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  // Upload logo to Supabase Storage
  const uploadLogo = async () => {
    // If no new file is selected, return the existing URL
    if (!logoFile) return initialLogoUrl; 

    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to the 'club-logos' bucket
    const { data, error } = await supabase.storage
      .from('club-logos')
      .upload(filePath, logoFile);

    if (error) throw error;

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('club-logos')
      .getPublicUrl(filePath);
    
    return publicUrl;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("User not found. Please log in again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalLogoUrl = await uploadLogo();

      const { error } = await supabase
        .from('admin_users')
        .update({
          club_name: clubName,
          club_logo_url: finalLogoUrl,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      alert('Club profile updated successfully!');
      router.push('/admin'); // Go back to dashboard
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(`Failed to update profile: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-red" />
        <p className="mt-4 text-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Button
        variant="ghost"
        onClick={() => router.push('/admin')}
        className="mb-4"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Dashboard
      </Button>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>
              <GradientText>Edit Club Profile</GradientText>
            </CardTitle>
            <CardDescription>
              This information will be shown on the homepage to help participants find your events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="clubName">Club Name *</Label>
              <Input
                id="clubName"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="e.g., IEEE Computer Society"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Club Logo</Label>
              {logoUrl && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">Logo Preview:</p>
                  <img
                    src={logoUrl}
                    alt="Club Logo Preview"
                    className="w-32 h-32 object-contain rounded-md border p-2"
                  />
                </div>
              )}
              
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-brand-red bg-brand-red/10' : 'border-gray-600'
                }`}
              >
                <input {...getInputProps()} />
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                {logoFile ? (
                  <p className="text-sm">
                    Selected: <strong>{logoFile.name}</strong>
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">
                    {isDragActive
                      ? 'Drop the logo here'
                      : 'Drag & drop a logo, or click to select'}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

export default function ClubProfilePage() {
  return (
    <ProtectedRoute>
      <ClubProfileContent />
    </ProtectedRoute>
  );
}