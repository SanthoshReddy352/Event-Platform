'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, Save, Loader2, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function EventGalleryManager({ eventId, initialEvent }) {
    const router = useRouter()
    const [images, setImages] = useState(initialEvent?.gallery_images || [])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [newUrl, setNewUrl] = useState('')
    const [isRestored, setIsRestored] = useState(false)

    const STORAGE_KEY = `gallery_draft_${eventId}`

    // Restore from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setImages(parsed)
                    setIsRestored(true)
                    // Clear the "Restored" badge after 3 seconds
                    setTimeout(() => setIsRestored(false), 3000)
                }
            } catch (e) {
                console.error("Failed to parse draft gallery", e)
            }
        }
    }, [eventId])

    // Save to localStorage whenever images change
    useEffect(() => {
        if (images?.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(images))
        }
    }, [images, eventId])

    const handleAddImage = () => {
        if (!newUrl.trim()) return

        let finalUrl = newUrl.trim()
        
        // Transform Google Drive Viewer Links to Direct Links
        // Supports: .../file/d/ID/view... or .../file/d/ID
        const driveRegex = /\/file\/d\/([-_\w]+)/
        const match = finalUrl.match(driveRegex)
        if (match && match[1]) {
            finalUrl = `https://lh3.googleusercontent.com/d/${match[1]}`
        }

        // Basic validation
        try {
            new URL(finalUrl)
            setImages([...images, finalUrl])
            setNewUrl('')
        } catch (e) {
            alert('Please enter a valid URL')
        }
    }

    const handleRemoveImage = (indexToRemove) => {
        setImages(images.filter((_, index) => index !== indexToRemove))
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const { error } = await supabase
                .from('events')
                .update({ gallery_images: images })
                .eq('id', eventId)

            if (error) throw error

            // Clear draft on successful save
            localStorage.removeItem(STORAGE_KEY)

            alert('Gallery updated successfully!')
            router.refresh()
        } catch (error) {
            console.error('Error updating gallery:', error)
            alert('Failed to update gallery')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                 <Link href={`/admin/events/${eventId}/dashboard`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Event Gallery</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-gray-400 text-sm">Manage images for {initialEvent?.title}</p>
                        {isRestored && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full animate-pulse">
                                Restored unsaved changes
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Add New Image</CardTitle>
                    <CardDescription>Enter a public URL for the image (e.g., from Google Drive, Unsplash, etc.)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input 
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddImage()}
                        />
                        <Button onClick={handleAddImage} disabled={!newUrl.trim()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gallery Preview ({images.length})</CardTitle>
                        <CardDescription>These images will be displayed on the public event page when the event is completed.</CardDescription>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="bg-brand-gradient text-white">
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </CardHeader>
                <CardContent>
                    {images.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500">No images in gallery yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {images.map((url, index) => (
                            <div className="space-y-1">
                                <div key={index} className="relative group aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border">
                                    <img 
                                        src={url} 
                                        alt={`Gallery ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            console.error('Image load failed:', url);
                                            e.target.src = 'https://placehold.co/600x400?text=Invalid+Image+URL'
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button 
                                            variant="destructive" 
                                            size="sm"
                                            onClick={() => handleRemoveImage(index)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Remove
                                        </Button>
                                    </div>
                                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100">
                                        {index + 1}
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 truncate px-1">{url}</p>
                            </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
