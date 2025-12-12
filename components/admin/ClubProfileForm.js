'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Link as LinkIcon, Loader2, AlertCircle, CheckCircle, Save, Building2, CreditCard } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase/client'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import LastWordGradientText from '@/components/LastWordGradientText'
import { useRouter } from 'next/navigation'
import { toast } from "sonner"
import { motion } from "framer-motion"

export default function ClubProfileForm({ user, initialData }) {
  const router = useRouter()
  // --- DATA PERSISTENCE & STATE ---
  const storageKey = 'adminClubProfileForm';

  // State initialization
  const [formData, setFormData] = useState({
      clubName: initialData?.club_name || '',
      clubLogoUrl: initialData?.club_logo_url || '',
      mode: initialData?.club_logo_url ? 'url' : 'upload',
      razorpayKeyId: initialData?.razorpay_key_id || '',
      razorpayKeySecret: '', // Never loaded from server
  });

  // Track if a secret is already saved in the DB
  const [isSecretSet, setIsSecretSet] = useState(!!initialData?.razorpay_key_secret);
  const [uploadFile, setUploadFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false)


  // Check session storage on mount to restore unsaved work
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const saved = window.sessionStorage.getItem(storageKey);
        if (saved) {
            const parsed = JSON.parse(saved);
            setFormData(prev => ({...parsed}));
        }
    }
  }, []);

  // Save form data to session storage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(storageKey, JSON.stringify(formData));
    }
  }, [formData]);
  
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

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        toast.error('Session expired. Please log in again.');
        setIsSubmitting(false);
        return;
    }

    try {
        let finalLogoUrl = formData.clubLogoUrl;
        if (formData.mode === 'upload' && uploadFile) {
            finalLogoUrl = await handleUpload();
        }

        const payload = {
            club_name: formData.clubName,
            club_logo_url: finalLogoUrl,
            razorpay_key_id: formData.razorpayKeyId,
        }
        
        if (formData.razorpayKeySecret && formData.razorpayKeySecret.trim() !== '') {
            payload.razorpay_key_secret = formData.razorpayKeySecret;
        }

        const response = await fetch('/api/admin/club-profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        toast.success('Profile updated successfully!')
        
        // Update UI state
        if (payload.razorpay_key_secret) {
            setIsSecretSet(true);
        }

        // Clear secret input & storage
        setFormData(prev => ({ ...prev, razorpayKeySecret: '', clubLogoUrl: finalLogoUrl }));
        setUploadFile(null);
        
        if (typeof window !== 'undefined') {
            const safeData = { 
                ...formData, 
                clubLogoUrl: finalLogoUrl, 
                razorpayKeySecret: '' 
            };
            window.sessionStorage.setItem(storageKey, JSON.stringify(safeData));
        }

        router.refresh();
    } catch (error) {
        console.error('Error updating profile:', error)
        toast.error(`Failed to update profile: ${error.message}`)
    } finally {
        setIsSubmitting(false)
    }
  }

  // Helper to get initials from club name
  const getInitials = (name) => {
    if (!name) return 'CL'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid gap-8 md:grid-cols-[300px_1fr]"
      >
        {/* Sidebar / Club Avatar Card */}
        <div className="space-y-6">
            <Card className="text-center pt-6 pb-2 overflow-hidden border-none shadow-lg bg-gradient-to-br from-background to-muted/50">
                <CardContent className="flex flex-col items-center">
                    <div className="relative mb-4 group">
                        <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                            <AvatarImage src={formData.clubLogoUrl} />
                            <AvatarFallback className="text-4xl bg-brand-gradient text-white">
                                {getInitials(formData.clubName)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <h2 className="text-2xl font-bold mb-1 truncate w-full px-2">{formData.clubName || 'Your Club'}</h2>
                    <p className="text-sm text-muted-foreground mb-4 truncate w-full px-2">Administrator Profile</p>

                </CardContent>
            </Card>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
            <Tabs defaultValue="identity" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 h-auto p-1 bg-muted/50">
                    <TabsTrigger value="identity" className="py-2.5 text-sm font-medium">
                      <Building2 className="mr-2 h-4 w-4" /> Club Identity
                    </TabsTrigger>
                    <TabsTrigger value="payment" className="py-2.5 text-sm font-medium">
                      <CreditCard className="mr-2 h-4 w-4" /> Payment
                    </TabsTrigger>
                </TabsList>

                <form onSubmit={handleSubmit}>
                    <TabsContent value="identity">
                        <Card>
                            <CardHeader>
                                <CardTitle><LastWordGradientText>Club Identity</LastWordGradientText></CardTitle>
                                <CardDescription>Basic information shown on event pages.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="clubName" className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-muted-foreground" /> Club Name
                                    </Label>
                                    <Input
                                        id="clubName"
                                        value={formData.clubName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, clubName: e.target.value }))}
                                        placeholder="e.g., IEEE Computer Society"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Label className="flex items-center gap-2">
                                        <Upload className="w-4 h-4 text-muted-foreground" /> Club Logo
                                    </Label>
                                    <div className="flex space-x-4">
                                        <Button
                                            type="button"
                                            variant={formData.mode === 'url' ? 'default' : 'outline'}
                                            onClick={() => setFormData(prev => ({ ...prev, mode: 'url' }))}
                                            className={formData.mode === 'url' ? 'bg-brand-gradient text-white hover:opacity-90' : ''}
                                            size="sm"
                                        >
                                            <LinkIcon size={14} className="mr-2" />
                                            Use URL
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={formData.mode === 'upload' ? 'default' : 'outline'}
                                            onClick={() => setFormData(prev => ({ ...prev, mode: 'upload' }))}
                                            className={formData.mode === 'upload' ? 'bg-brand-gradient text-white hover:opacity-90' : ''}
                                            size="sm"
                                        >
                                            <Upload size={14} className="mr-2" />
                                            Upload
                                        </Button>
                                    </div>

                                    {formData.mode === 'url' ? (
                                        <div className="space-y-2">
                                            <Input
                                                id="clubLogoUrl"
                                                value={formData.clubLogoUrl}
                                                onChange={(e) => setFormData(prev => ({ ...prev, clubLogoUrl: e.target.value }))}
                                                placeholder="https://example.com/logo.png"
                                            />
                                            <p className="text-xs text-muted-foreground">Enter a direct link to your club's logo image.</p>
                                        </div>
                                    ) : (
                                        <div
                                            {...getRootProps()}
                                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                                                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'
                                            }`}
                                        >
                                            <input {...getInputProps()} />
                                            <Upload size={32} className="mx-auto mb-2 text-muted-foreground" />
                                            {uploadFile ? (
                                                <p className="text-sm text-brand-orange">Selected: <strong>{uploadFile.name}</strong></p>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    {isDragActive ? 'Drop here' : 'Drag & drop or click to select'}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end pt-4 border-t">
                                <Button
                                    type="submit"
                                    className="bg-brand-gradient text-white min-w-[140px]"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    <TabsContent value="payment">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-brand-red" />
                                    <LastWordGradientText>Payment Gateway (Razorpay)</LastWordGradientText>
                                </CardTitle>
                                <CardDescription>Enter your club's Razorpay API Keys. Payments go directly to your account.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="keyId">Key ID</Label>
                                    <Input
                                        id="keyId"
                                        value={formData.razorpayKeyId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, razorpayKeyId: e.target.value }))}
                                        placeholder="rzp_live_..."
                                        className="font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="keySecret">Key Secret</Label>
                                        {isSecretSet && (
                                            <span className="text-xs text-green-500 flex items-center font-medium bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                                                <CheckCircle size={12} className="mr-1" />
                                                Active Key Saved
                                            </span>
                                        )}
                                    </div>
                                    <Input
                                        id="keySecret"
                                        type="password"
                                        value={formData.razorpayKeySecret}
                                        onChange={(e) => setFormData(prev => ({ ...prev, razorpayKeySecret: e.target.value }))}
                                        placeholder={isSecretSet ? "●●●●●●●● (Saved - Enter new value to update)" : "Enter your Key Secret"}
                                        className={`font-mono text-sm ${isSecretSet && !formData.razorpayKeySecret ? "border-green-500/50 bg-green-500/5 placeholder:text-green-600/70" : ""}`}
                                    />
                                </div>
                                
                                <Alert className="bg-blue-500/5 border-blue-500/20">
                                    <AlertCircle className="h-4 w-4 text-blue-500" />
                                    <AlertTitle className="text-blue-500">How to get keys?</AlertTitle>
                                    <AlertDescription className="text-muted-foreground mt-1">
                                        1. Log in to your <a href="https://dashboard.razorpay.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold text-blue-500 hover:text-blue-400">Razorpay Dashboard</a>.<br/>
                                        2. Go to Settings → API Keys → Generate New Key.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                            <CardFooter className="flex justify-end pt-4 border-t">
                                <Button
                                    type="submit"
                                    className="bg-brand-gradient text-white min-w-[140px]"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                </form>
            </Tabs>
        </div>
      </motion.div>
    </div>
  )
}
