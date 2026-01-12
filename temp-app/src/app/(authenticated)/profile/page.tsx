"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, Edit, Users, FolderKanban, Award, LogOut, ChevronDown } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

import { ProfileEditForm } from "@/components/profile-edit-form"
import { AvatarUpload } from "@/components/avatar-upload"
import { AchievementsDisplay } from "@/components/achievements-display"
import { FriendManager } from "@/components/friend-manager"
import { SettingsDialog } from "@/components/settings-dialog"
import { Settings as SettingsIcon } from "lucide-react"

export default function ProfilePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)
    const [isEditMode, setIsEditMode] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

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

    // User status (Discord-style)
    type UserStatusType = 'online' | 'away' | 'dnd'
    const [userStatus, setUserStatus] = useState<UserStatusType>('online')

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

    const handleLogout = async () => {
        setLoading(true)
        await supabase.auth.signOut()
        router.push("/login")
    }

    const handleStatusChange = (status: 'online' | 'away' | 'dnd') => {
        setUserStatus(status)
        // TODO: Can persist to database if needed
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
                        <CardContent className="p-6 md:p-8 relative">
                            {/* Settings Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-4 right-4 md:top-6 md:right-6 text-muted-foreground hover:text-foreground z-10"
                                onClick={() => setIsSettingsOpen(true)}
                            >
                                <SettingsIcon className="h-5 w-5" />
                            </Button>

                            <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

                            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                                {/* Avatar with Status Indicator */}
                                <div className="flex justify-center md:justify-start">
                                    <div className="relative">
                                        <Avatar className="h-32 w-32 md:h-40 md:w-40 ring-4 ring-primary/30">
                                            <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username} />
                                            <AvatarFallback className="text-4xl font-bold bg-primary/10 text-primary">
                                                {getInitials()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {/* Discord-style Status Indicator */}
                                        <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2">
                                            <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full ring-4 ring-card ${userStatus === 'online' ? 'bg-green-500' :
                                                    userStatus === 'away' ? 'bg-yellow-500' : 'bg-red-500'
                                                }`} />
                                        </div>
                                    </div>
                                </div>

                                {/* Profile Info */}
                                <div className="flex-1 space-y-4">
                                    {/* Display Name with Status Selector */}
                                    <div className="text-center md:text-left">
                                        <div className="flex items-center justify-center md:justify-start gap-1">
                                            <h1 className="text-2xl md:text-3xl font-bold">
                                                {profile.display_name || profile.username}
                                            </h1>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                                                        <ChevronDown className="h-4 w-4" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-48 p-1" align="start">
                                                    <div className="space-y-0.5">
                                                        <button
                                                            onClick={() => handleStatusChange('online')}
                                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors ${userStatus === 'online' ? 'bg-muted' : ''
                                                                }`}
                                                        >
                                                            <div className="w-3 h-3 rounded-full bg-green-500" />
                                                            Online
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange('away')}
                                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors ${userStatus === 'away' ? 'bg-muted' : ''
                                                                }`}
                                                        >
                                                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                                            Away
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange('dnd')}
                                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors ${userStatus === 'dnd' ? 'bg-muted' : ''
                                                                }`}
                                                        >
                                                            <div className="w-3 h-3 rounded-full bg-red-500" />
                                                            Do Not Disturb
                                                        </button>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <p className="text-muted-foreground">@{profile.username}</p>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex gap-6 md:gap-8 justify-center md:justify-start">
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

                                    {/* Badges */}
                                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
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

                            {/* Edit & Logout Buttons - At Bottom */}
                            <div className="flex gap-2 mt-6 pt-6 border-t justify-center md:justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditMode(!isEditMode)}
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Profile
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Logout
                                </Button>
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
