"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, UserPlus, FolderPlus, Check, X, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/hooks/useNotifications"

export default function NotificationsPage() {
    const router = useRouter()
    const { 
        loading, 
        friendRequests, 
        projectInvites, 
        rejectedCheckpoints,
        handleFriendResponse, 
        handleProjectInvitation 
    } = useNotifications()

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push("/login")
            }
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

    const totalNotifications = friendRequests.length + projectInvites.length + rejectedCheckpoints.length

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto p-4 md:p-6 space-y-6 pb-24 md:pb-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                {totalNotifications === 0
                                    ? "You're all caught up!"
                                    : `You have ${totalNotifications} pending ${totalNotifications === 1 ? 'notification' : 'notifications'}`}
                            </p>
                        </div>
                    </div>

                    {/* Rejected Checkpoints */}
                    {rejectedCheckpoints.length > 0 && (
                        <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                    <AlertCircle className="h-5 w-5" />
                                    Rejected Checkpoints
                                    <Badge variant="destructive">{rejectedCheckpoints.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {rejectedCheckpoints.map(checkpoint => (
                                    <div
                                        key={checkpoint.id}
                                        className="flex flex-col p-4 border border-red-200 dark:border-red-900/50 rounded-lg bg-white dark:bg-background"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium">{checkpoint.project.title}</p>
                                                <p className="text-sm text-muted-foreground">Checkpoint: <span className="font-semibold text-foreground">{checkpoint.title}</span></p>
                                                {checkpoint.rejection_reason && (
                                                    <p className="text-sm mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-red-800 dark:text-red-300 italic">
                                                        "{checkpoint.rejection_reason}"
                                                    </p>
                                                )}
                                            </div>
                                            <Badge variant="outline" className="text-red-600 border-red-200">
                                                Rating: {checkpoint.rating}/10
                                            </Badge>
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/projects/${checkpoint.project.id}`)}>
                                                View Project
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Friend Requests */}
                    {friendRequests.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UserPlus className="h-5 w-5" />
                                    Friend Requests
                                    <Badge variant="secondary">{friendRequests.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {friendRequests.map(request => (
                                    <div
                                        key={request.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <UserPlus className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium truncate">
                                                    {request.sender.display_name || request.sender.username}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    @{request.sender.username} sent you a friend request
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleFriendResponse(request.id, false)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleFriendResponse(request.id, true)}
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Project Invitations */}
                    {projectInvites.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FolderPlus className="h-5 w-5" />
                                    Project Invitations
                                    <Badge variant="secondary">{projectInvites.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {projectInvites.map(invitation => (
                                    <div
                                        key={invitation.project_id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                                <FolderPlus className="h-5 w-5 text-blue-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium truncate">
                                                    {invitation.project.title}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Invited by {invitation.project.owner?.display_name || invitation.project.owner?.username || "Unknown"} as{" "}
                                                    <Badge variant="outline" className="capitalize text-xs">
                                                        {invitation.role}
                                                    </Badge>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleProjectInvitation(invitation.project_id, false)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleProjectInvitation(invitation.project_id, true)}
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Empty State */}
                    {totalNotifications === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Check className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="font-semibold text-lg mb-1">All caught up!</h3>
                                <p className="text-sm text-muted-foreground text-center max-w-sm">
                                    You don't have any pending notifications right now. Check back later for friend requests and project invitations.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    )
}
