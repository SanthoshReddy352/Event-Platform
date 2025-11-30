'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import GradientText from '@/components/GradientText'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Link as LinkIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { Separator } from '@/components/ui/separator'
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
        // Bank Details
        bankAccountNo: '',
        bankIfsc: '',
        bankHolderName: '',
        bankName: '',
        accountType: 'savings'
      };
    }
    const saved = window.sessionStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : { 
      clubName: '', 
      clubLogoUrl: '', 
      mode: 'url',
      bankAccountNo: '',
      bankIfsc: '',
      bankHolderName: '',
      bankName: '',
      accountType: 'savings'
    };
  });

  const [uploadFile, setUploadFile] = useState(null);
  
  // FIX: Initialize loading based on whether we have data. 
  // If we have cached data, we don't show the spinner.
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !window.sessionStorage.getItem(storageKey);
  });

  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Razorpay Specific State
  const [razorpayAccountId, setRazorpayAccountId] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!user) return
    
    // FIX: Only set loading to true if we don't have any data to show yet.
    // This prevents the "flash" of the spinner on revisit.
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
        setRazorpayAccountId(data.razorpay_account_id);
        
        // Only populate from DB if sessionStorage is empty to avoid overwriting unsaved edits
        const savedData = window.sessionStorage.getItem(storageKey);
        if (!savedData) {
          setFormData({
            clubName: data.club_name || '',
            clubLogoUrl: data.club_logo_url || '',
            mode: data.club_logo_url ? 'url' : 'upload',
            bankAccountNo: data.bank_account_no || '',
            bankIfsc: data.bank_ifsc || '',
            bankHolderName: data.bank_holder_name || '',
            bankName: data.bank_name || '',
            accountType: data.account_type || 'savings',
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

  // --- SAVE PROFILE (Club + Bank Details) ---
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
        // Bank Details
        bank_account_no: formData.bankAccountNo,
        bank_ifsc: formData.bankIfsc,
        bank_holder_name: formData.bankHolderName,
        bank_name: formData.bankName,
        account_type: formData.accountType,
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

  // --- CONNECT RAZORPAY ---
  const handleConnectRazorpay = async () => {
    if (!user) return;
    
    // Validation
    if (!formData.bankAccountNo || !formData.bankIfsc || !formData.bankHolderName) {
      alert("Please fill in and SAVE your bank details first.");
      return;
    }

    setIsConnecting(true);
    try {
      const res = await fetch("/api/razorpay/onboard-club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect");
      }

      if (data.success) {
        alert("Payouts connected successfully!");
        setRazorpayAccountId(data.accountId); // Update state immediately
      }
    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

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
        <GradientText>Club Profile & Payouts</GradientText>
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

        {/* SECTION 2: BANK DETAILS */}
        <Card>
          <CardHeader>
            <CardTitle>Bank Details</CardTitle>
            <CardDescription>
              Required for receiving payouts from paid events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankHolderName">Account Holder Name</Label>
                <Input
                  id="bankHolderName"
                  value={formData.bankHolderName}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankHolderName: e.target.value }))}
                  placeholder="As per bank records"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountNo">Account Number</Label>
                <Input
                  id="bankAccountNo"
                  type="password"
                  value={formData.bankAccountNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNo: e.target.value }))}
                  placeholder="Enter Account Number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankIfsc">IFSC Code</Label>
                <Input
                  id="bankIfsc"
                  value={formData.bankIfsc}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankIfsc: e.target.value.toUpperCase() }))}
                  placeholder="e.g. HDFC0001234"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  placeholder="e.g. HDFC Bank"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type</Label>
                <Select
                  onValueChange={(value) => setFormData(prev => ({ ...prev, accountType: value }))}
                  value={formData.accountType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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

      <Separator className="my-8" />

      {/* SECTION 3: RAZORPAY STATUS */}
      <Card className="border-brand-primary/20 bg-brand-primary/5">
        <CardHeader>
          <CardTitle>Payouts Configuration</CardTitle>
          <CardDescription>
            Connect your bank account to Razorpay to receive automatic settlements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {razorpayAccountId ? (
            <Alert className="bg-green-500/10 border-green-500 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Active & Connected</AlertTitle>
              <AlertDescription>
                Your account is linked with Razorpay (ID: {razorpayAccountId}). Payments will settle automatically to your saved bank account.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Alert className="bg-yellow-500/10 border-yellow-500 text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Not Connected</AlertTitle>
                <AlertDescription>
                  You must link your account to enable split payments. Ensure your bank details above are saved first.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleConnectRazorpay} 
                disabled={isConnecting || !formData.bankAccountNo}
                variant="default"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Connect Payouts via Razorpay
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
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