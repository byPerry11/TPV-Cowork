"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Upload, Loader2, User } from "lucide-react"
import { toast } from "sonner"

interface AvatarUploadProps {
    userId: string
}

export function AvatarUpload({ userId }: AvatarUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [username, setUsername] = useState<string>("")

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

    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Debes seleccionar una imagen')
            }

            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const filePath = `${userId}/avatar.${fileExt}`

            // Delete old avatar if exists
            if (avatarUrl) {
                const oldPath = avatarUrl.split('/').pop()
                if (oldPath) {
                    await supabase.storage.from('avatars').remove([`${userId}/${oldPath}`])
                }
            }

            // Upload new avatar
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId)

            if (updateError) throw updateError

            setAvatarUrl(publicUrl)
            toast.success('Foto de perfil actualizada')
        } catch (error: any) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            toast.error('Error al subir la imagen', {
                description: error.message
            })
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl || ""} alt={username} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {username?.charAt(0).toUpperCase() || <User className="h-10 w-10" />}
                </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                    JPG, GIF o PNG. Tamaño máximo 1MB.
                </p>
                <Button
                    variant="outline"
                    disabled={uploading}
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Subiendo...
                        </>
                    ) : (
                        <>
                            <Upload className="mr-2 h-4 w-4" />
                            Subir Foto
                        </>
                    )}
                </Button>
                <input
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
