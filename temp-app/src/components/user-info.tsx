"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Mail, User, Loader2 } from "lucide-react"

interface UserInfoProps {
    userId: string
}

interface UserData {
    email: string | undefined
    username: string | null
    display_name: string | null
}

export function UserInfo({ userId }: UserInfoProps) {
    const [userData, setUserData] = useState<UserData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Get email from auth
                const { data: { user } } = await supabase.auth.getUser()

                // Get profile data
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, display_name')
                    .eq('id', userId)
                    .single()

                setUserData({
                    email: user?.email,
                    username: profile?.username,
                    display_name: profile?.display_name
                })
            } catch (error) {
                console.error('Error fetching user data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchUserData()
    }, [userId])

    if (loading) {
        return (
            <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Correo Electrónico</span>
                    <span className="text-sm font-medium">{userData?.email || "No disponible"}</span>
                </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Nombre de Usuario</span>
                    <span className="text-sm font-medium">{userData?.username || "No configurado"}</span>
                </div>
            </div>

            {userData?.display_name && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Nombre para Mostrar</span>
                        <span className="text-sm font-medium">{userData.display_name}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
