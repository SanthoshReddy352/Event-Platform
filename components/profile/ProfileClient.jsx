'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from '@/lib/supabase/client'
import { Loader2, ShieldCheck, KeyRound, User, Mail, Phone, Save } from 'lucide-react'
import LastWordGradientText from '@/components/LastWordGradientText'
import { toast } from "sonner"
import { motion } from "framer-motion"

import { useAuth } from '@/context/AuthContext' // NEW

export default function ProfileClient({ initialProfile, user }) {
  const { session } = useAuth() // NEW
  const [profile, setProfile] = useState({
    name: initialProfile?.name || '',
    phone_number: initialProfile?.phone_number || '',
    email: initialProfile?.email || user?.email || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' })
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()

    if (passwordData.newPassword.length < 6) {
        toast.error("Password must be at least 6 characters.")
        return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error("Passwords do not match.")
        return
    }

    setIsPasswordSubmitting(true)
    try {
        const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword })
        if (error) throw error

        toast.success("Password updated successfully!")
        setPasswordData({ newPassword: '', confirmPassword: '' })
    } catch (error) {
        toast.error(error.message || "Failed to update password")
    } finally {
        setIsPasswordSubmitting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
    const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: profile.name,
          phone_number: profile.phone_number
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success("Profile updated successfully!")
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error(error.message || "Failed to update profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper to get initials
  const getInitials = (name) => {
    if (!name) return 'U'
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
        {/* Sidebar / Header Information */}
        <div className="space-y-6">
            <Card className="text-center pt-6 pb-2 overflow-hidden border-none shadow-lg bg-gradient-to-br from-background to-muted/50">
                <CardContent className="flex flex-col items-center">
                    <div className="relative mb-4 group">
                        <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                            <AvatarImage src={user?.user_metadata?.avatar_url} />
                            <AvatarFallback className="text-4xl bg-brand-gradient text-white">
                                {getInitials(profile.name || user?.email)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <h2 className="text-2xl font-bold mb-1 truncate w-full px-2">{profile.name || 'User'}</h2>
                    <p className="text-sm text-muted-foreground mb-4 truncate w-full px-2">{profile.email}</p>
                </CardContent>
            </Card>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 h-auto p-1 bg-muted/50">
                    <TabsTrigger value="general" className="py-2.5 text-sm font-medium">General Info</TabsTrigger>
                    <TabsTrigger value="security" className="py-2.5 text-sm font-medium">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle><LastWordGradientText>Profile Information</LastWordGradientText></CardTitle>
                            <CardDescription>Update your personal details here.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmit}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-muted-foreground" /> Email
                                    </Label>
                                    <Input
                                        id="email"
                                        value={profile.email}
                                        disabled
                                        className="bg-muted/50"
                                    />
                                    <p className="text-xs text-muted-foreground">Email address cannot be changed.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground" /> Full Name
                                    </Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={profile.name}
                                        onChange={handleChange}
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone_number" className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-muted-foreground" /> Phone Number
                                    </Label>
                                    <Input
                                        id="phone_number"
                                        name="phone_number"
                                        value={profile.phone_number}
                                        onChange={handleChange}
                                        placeholder="+91 98765 43210"
                                    />
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
                        </form>
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-brand-red" />
                                <LastWordGradientText>Security Settings</LastWordGradientText>
                            </CardTitle>
                            <CardDescription>Manage your password and account security.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handlePasswordSubmit}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="newPassword"
                                            name="newPassword"
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="••••••••"
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="••••••••"
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end pt-4 border-t">
                                <Button
                                    type="submit"
                                    variant="outline"
                                    className="min-w-[140px] border-brand-red/50 text-brand-red hover:bg-brand-red/10 hover:text-brand-red"
                                    disabled={isPasswordSubmitting}
                                >
                                    {isPasswordSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        'Update Password'
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
      </motion.div>
    </div>
  )
}
