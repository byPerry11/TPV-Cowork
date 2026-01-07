"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, User, Award, ArrowLeft, Menu, UsersRound } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProfileEditForm } from "@/components/profile-edit-form"
import { AvatarUpload } from "@/components/avatar-upload"
import { AchievementsDisplay } from "@/components/achievements-display"
import { UserInfo } from "@/components/user-info"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context"
import { FriendManager } from "@/components/friend-manager"

function ProfileContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const defaultTab = searchParams.get('tab') || 'profile'
    const [userId, setUserId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const { toggle } = useSidebar() // Keep useSidebar for the toggle button

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

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            <AppSidebar />

            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto p-4 md:p-6 space-y-6 md:space-y-8 max-w-4xl">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggle}
                                className="md:hidden"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                            <div className="flex-1">
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mi Perfil</h1>
                                <p className="text-sm md:text-base text-muted-foreground">
                                    Gestiona tu información personal y logros
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={() => router.push("/dashboard")} className="hidden sm:flex">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver al Home
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => router.push("/dashboard")} className="sm:hidden">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
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
        <SidebarProvider>
            <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                <ProfileContent />
            </Suspense>
        </SidebarProvider>
    )
}
