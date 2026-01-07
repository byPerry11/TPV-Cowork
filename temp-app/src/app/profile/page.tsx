"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, User, Award } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfileEditForm } from "@/components/profile-edit-form"
import { AvatarUpload } from "@/components/avatar-upload"
import { AchievementsDisplay } from "@/components/achievements-display"

export default function ProfilePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push("/login")
                return
            }
            setUserId(session.user.id)
            setLoading(false)
        }
        checkUser()
    }, [router])

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto p-6 space-y-8 max-w-4xl">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
                        <p className="text-muted-foreground">
                            Gestiona tu información personal y logros
                        </p>
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="profile" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="profile">
                                <User className="mr-2 h-4 w-4" />
                                Perfil
                            </TabsTrigger>
                            <TabsTrigger value="achievements">
                                <Award className="mr-2 h-4 w-4" />
                                Logros
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Foto de Perfil</CardTitle>
                                    <CardDescription>
                                        Sube o actualiza tu foto de perfil
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {userId && <AvatarUpload userId={userId} />}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Información Personal</CardTitle>
                                    <CardDescription>
                                        Actualiza tu nombre de usuario y nombre para mostrar
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {userId && <ProfileEditForm userId={userId} />}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="achievements">
                            {userId && <AchievementsDisplay userId={userId} />}
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    )
}
