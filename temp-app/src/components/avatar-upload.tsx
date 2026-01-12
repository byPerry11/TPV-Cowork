"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Upload, Loader2, User, Crop } from "lucide-react"
import { toast } from "sonner"
import imageCompression from 'browser-image-compression'

interface AvatarUploadProps {
    userId: string
}

export function AvatarUpload({ userId }: AvatarUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [username, setUsername] = useState<string>("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const fetchProfile = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('avatar_url, username, display_name')
                .eq('id', userId)
                .single()

            if (data) {
                setAvatarUrl(data.avatar_url)
                setUsername(data.display_name || data.username || "Usuario")
            }
        }
        fetchProfile()
    }, [userId])

    const compressAndCropImage = async (file: File): Promise<File> => {
        try {
            // Compression options
            const options = {
                maxSizeMB: 0.5, // Max 500KB
                maxWidthOrHeight: 400, // Max 400px (good for avatars)
                useWebWorker: true,
                fileType: 'image/jpeg' as const
            }

            // Compress image
            const compressedFile = await imageCompression(file, options)

            // Create circular crop canvas
            const img = await imageCompression.getDataUrlFromFile(compressedFile)
            const image = new Image()
            await new Promise((resolve) => {
                image.onload = resolve
                image.src = img
            })

            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Canvas not supported')

            // Set canvas to square (circular crop)
            const size = Math.min(image.width, image.height)
            canvas.width = size
            canvas.height = size

            // Crop to center square
            const sx = (image.width - size) / 2
            const sy = (image.height - size) / 2

            // Draw circular clipped image
            ctx.beginPath()
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
            ctx.closePath()
            ctx.clip()

            ctx.drawImage(image, sx, sy, size, size, 0, 0, size, size)

            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85)
            })

            return new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' })
        } catch (error) {
            console.error('Image compression error:', error)
            throw error
        }
    }

    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Debes seleccionar una imagen')
            }

            const originalFile = event.target.files[0]

            // Compress and crop image
            const processedFile = await compressAndCropImage(originalFile)

            const filePath = `${userId}/avatar.jpg`

            // Delete old avatar if exists (Handle cache busters)
            if (avatarUrl) {
                try {
                    // Extract filename from URL (remove query params)
                    const cleanUrl = avatarUrl.split('?')[0]
                    const oldPath = cleanUrl.split('/').pop()
                    
                    if (oldPath) {
                        // We always use 'avatar.jpg' now, but just in case old legacy names exist
                        await supabase.storage.from('avatars').remove([`${userId}/${oldPath}`])
                    }
                } catch (e) {
                    console.warn("Failed to cleanup old avatar", e)
                    // Continue anyway, upsert should handle it
                }
            }

            // Upload new avatar
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, processedFile, { upsert: true })

            if (uploadError) {
                console.error("Supabase Upload Error:", uploadError) 
                throw uploadError
            }

            // Get public URL with cache buster
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`

            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: urlWithCacheBuster })
                .eq('id', userId)

            if (updateError) throw updateError

            setAvatarUrl(urlWithCacheBuster)
            toast.success('Foto de perfil actualizada y optimizada')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error('Error al subir la imagen', {
                description: error.message
            })
        } finally {
            setUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    return (
        <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 ring-2 ring-offset-2 ring-primary/10">
                <AvatarImage src={avatarUrl || ""} alt={username} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {username?.charAt(0).toUpperCase() || <User className="h-10 w-10" />}
                </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Foto de perfil circular</p>
                <p className="text-sm text-muted-foreground">
                    JPG, GIF o PNG. Se optimizará automáticamente.
                </p>
                <Button
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Procesando...
                        </>
                    ) : (
                        <>
                            <Upload className="mr-2 h-4 w-4" />
                            Subir Foto
                        </>
                    )}
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={uploading}
                    className="hidden"
                />
            </div>
        </div>
    )
}
