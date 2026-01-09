"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, Edit, Users, FolderKanban, Award } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

import { ProfileEditForm } from "@/components/profile-edit-form"
import { AvatarUpload } from "@/components/avatar-upload"
import { AchievementsDisplay } from "@/components/achievements-display"
import { FriendManager } from "@/components/friend-manager"

export default function ProfilePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)
    const [isEditMode, setIsEditMode] = useState(false)

    const [profile, setProfile] = useState<{
        username: string
        display_name: string | null
        avatar_url: string | null
        bio?: string | null
    } | null>(null)

    const [stats, setStats] = useState({
        projects: 0,
        friends: 0,
        achievements: 0
    })

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push("/login")
                return
            }
            setUserId(session.user.id)
            await fetchProfile(session.user.id)
            await fetchStats(session.user.id)
            setLoading(false)
        }
        checkUser()
    }, [router])

    const fetchProfile = async (uid: string) => {
        const { data } = await supabase
            .from("profiles")
            .select("username, display_name, avatar_url")
            .eq("id", uid)
            .single()

        if (data) {
            setProfile(data)
        }
    }

    const fetchStats = async (uid: string) => {
        // Count projects
        const { count: projectCount } = await supabase
            .from("project_members")
            .select("*", { count: "exact", head: true })
            .eq("user_id", uid)
            .eq("status", "active")

        // Count friends (accepted friend requests)
        const { count: friendCount } = await supabase
            .from("friend_requests")
            .select("*", { count: "exact", head: true })
            .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
            .eq("status", "accepted")

        // Count achievements
        const { count: achievementCount } = await supabase
            .from("user_achievements")
            .select("*", { count: "exact", head: true })
            .eq("user_id", uid)

        setStats({
            projects: projectCount || 0,
            friends: friendCount || 0,
            achievements: achievementCount || 0
        })
    }

    const getInitials = () => {
        if (profile?.display_name) {
            return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        }
        return profile?.username?.slice(0, 2).toUpperCase() || "U"
    }

    const handleProfileUpdated = () => {
        if (userId) {
            fetchProfile(userId)
            setIsEditMode(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!profile || !userId) return null

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
            <Card className="w-full max-w-4xl shadow-xl border-t-4 border-t-primary">
                <div className="container mx-auto max-w-5xl p-4 md:p-6 space-y-6 pb-24 md:pb-6">
                    {/* Instagram-style Header */}
                    <Card>
                        <CardContent className="p-6 md:p-8">
                            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                                {/* Avatar */}
                                <div className="flex justify-center md:justify-start">
                                    <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-primary/20">
                                        <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username} />
                                        <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">
                                            {getInitials()}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>

                                {/* Profile Info */}
                                <div className="flex-1 space-y-4">
                                    {/* Username & Edit Button */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                        <h1 className="text-2xl md:text-3xl font-bold">
                                            {profile.display_name || profile.username}
                                        </h1>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsEditMode(!isEditMode)}
                                            className="w-full sm:w-auto"
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit Profile
                                        </Button>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex gap-6 md:gap-8">
                                        <div className="flex flex-col items-center sm:items-start">
                                            <span className="text-xl md:text-2xl font-bold">{stats.projects}</span>
                                            <span className="text-sm text-muted-foreground">Projects</span>
                                        </div>
                                        <div className="flex flex-col items-center sm:items-start">
                                            <span className="text-xl md:text-2xl font-bold">{stats.friends}</span>
                                            <span className="text-sm text-muted-foreground">Friends</span>
                                        </div>
                                        <div className="flex flex-col items-center sm:items-start">
                                            <span className="text-xl md:text-2xl font-bold">{stats.achievements}</span>
                                            <span className="text-sm text-muted-foreground">Achievements</span>
                                        </div>
                                    </div>

                                    {/* Display name and username */}
                                    <div className="space-y-1">
                                        {profile.display_name && (
                                            <p className="font-semibold">{profile.display_name}</p>
                                        )}
                                        <p className="text-sm text-muted-foreground">@{profile.username}</p>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            <FolderKanban className="h-3 w-3" />
                                            Active Member
                                        </Badge>
                                        {stats.achievements > 0 && (
                                            <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                                                <Award className="h-3 w-3" />
                                                {stats.achievements} Achievements
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Edit Profile Form (Collapsible) */}
                    {isEditMode && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Edit Profile</CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setIsEditMode(false)
                                            if (userId) fetchProfile(userId)
                                        }}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Avatar Upload Section */}
                                <div className="flex flex-col items-center gap-4 pb-6 border-b">
                                    <h3 className="text-sm font-medium">Profile Picture</h3>
                                    <AvatarUpload userId={userId} />
                                </div>

                                {/* Profile Edit Form */}
                                <ProfileEditForm userId={userId} />
                            </CardContent>
                        </Card>
                    )}

                    {/* Tabs for Content */}
                    <Tabs defaultValue="achievements" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
                            <TabsTrigger value="achievements" className="flex items-center gap-2">
                                <Award className="h-4 w-4" />
                                <span className="hidden sm:inline">Achievements</span>
                                <span className="sm:hidden">Awards</span>
                            </TabsTrigger>
                            <TabsTrigger value="friends" className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Friends
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="achievements" className="mt-6">
                            <Suspense
                                fallback={
                                    <div className="flex justify-center p-8">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                }
                            >
                                <AchievementsDisplay userId={userId} />
                            </Suspense>
                        </TabsContent>

                        <TabsContent value="friends" className="mt-6">
                            <Suspense
                                fallback={
                                    <div className="flex justify-center p-8">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                }
                            >
                                <FriendManager userId={userId} />
                            </Suspense>
                        </TabsContent>
                    </Tabs>
                </div>
            </Card>
        </div>
    )
}
