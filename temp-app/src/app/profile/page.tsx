"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, User, Award, ArrowLeft, UsersRound, LogOut } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProfileEditForm } from "@/components/profile-edit-form"
import { AvatarUpload } from "@/components/avatar-upload"
import { AchievementsDisplay } from "@/components/achievements-display"
import { UserInfo } from "@/components/user-info"
import { FloatingNav } from "@/components/floating-nav"
import { FriendManager } from "@/components/friend-manager"
import { toast } from "sonner"

function ProfileContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const defaultTab = searchParams.get('tab') || 'profile'
    const [userId, setUserId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUserId(user.id)
            setLoading(false)
        }
        getUser()
    }, [router])

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) {
            toast.error("Error signing out")
        } else {
            router.push("/login")
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            <FloatingNav />

            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto p-4 md:p-6 space-y-6 md:space-y-8 max-w-4xl pb-24 md:pb-6">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mi Perfil</h1>
                            <p className="text-sm md:text-base text-muted-foreground">
                                Gestiona tu información personal y logros
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => router.push("/dashboard")} className="hidden sm:flex">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver al Home
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => router.push("/dashboard")} className="sm:hidden">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" onClick={handleLogout} className="hidden sm:flex">
                                <LogOut className="mr-2 h-4 w-4" />
                                Cerrar Sesión
                            </Button>
                            <Button variant="destructive" size="icon" onClick={handleLogout} className="sm:hidden">
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="profile" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="profile">
                                <User className="mr-2 h-4 w-4" />
                                Perfil
                            </TabsTrigger>
                            <TabsTrigger value="achievements">
                                <Award className="mr-2 h-4 w-4" />
                                Logros
                            </TabsTrigger>
                            <TabsTrigger value="friends">
                                <UsersRound className="mr-2 h-4 w-4" />
                                Amigos
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
                                    <CardTitle>Información de Cuenta</CardTitle>
                                    <CardDescription>
                                        Detalles de tu cuenta
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {userId && <UserInfo userId={userId} />}
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

                        <TabsContent value="friends">
                            {userId && <FriendManager userId={userId} />}
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    )
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ProfileContent />
        </Suspense>
    )
}
