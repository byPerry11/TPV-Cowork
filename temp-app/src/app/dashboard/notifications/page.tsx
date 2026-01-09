"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, UserPlus, FolderPlus, Check, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FloatingNav } from "@/components/floating-nav"
import { toast } from "sonner"

interface FriendRequest {
    id: string
    sender_id: string
    sender: {
        display_name: string | null
        username: string
        avatar_url: string | null
    }
    created_at: string
}

interface ProjectInvitation {
    project_id: string
    user_id: string
    project: {
        title: string
        owner: {
            display_name: string | null
            username: string
        }
    }
    role: string
    created_at: string
}

export default function NotificationsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
    const [projectInvitations, setProjectInvitations] = useState<ProjectInvitation[]>([])

    useEffect(() => {
        const checkUserAndFetch = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push("/login")
                return
            }

            await fetchNotifications(session.user.id)
            setLoading(false)
        }
        checkUserAndFetch()
    }, [router])

    const fetchNotifications = async (userId: string) => {
        // Fetch friend requests - only IDs first
        const { data: friendReqs, error: friendReqError } = await supabase
            .from("friend_requests")
            .select('id, sender_id, created_at')
            .eq("receiver_id", userId)
            .eq("status", "pending")
            .order("created_at", { ascending: false })

        if (friendReqError) {
            console.error("Error fetching friend requests:", friendReqError)
        }

        // Fetch sender profiles separately
        if (friendReqs && friendReqs.length > 0) {
            const senderIds = friendReqs.map(r => r.sender_id)
            const { data: senderProfiles } = await supabase
                .from("profiles")
                .select('id, display_name, username, avatar_url')
                .in('id', senderIds)

            // Merge profiles with requests
            const requestsWithProfiles = friendReqs.map(req => ({
                ...req,
                sender: senderProfiles?.find(p => p.id === req.sender_id) || {
                    display_name: null,
                    username: 'Unknown',
                    avatar_url: null
                }
            }))
            setFriendRequests(requestsWithProfiles as FriendRequest[])
        } else {
            setFriendRequests([])
        }

        // Fetch project invitations - this query should work fine
        const { data: projectInvites } = await supabase
            .from("project_members")
            .select(`
        project_id,
        user_id,
        role,
       created_at,
        project:project_id (
          title,
          owner:owner_id (
            display_name,
            username
          )
        )
      `)
            .eq("user_id", userId)
            .eq("status", "pending")
            .order("created_at", { ascending: false })

        if (projectInvites) {
            setProjectInvitations(projectInvites as unknown as ProjectInvitation[])
        }
    }

    const handleFriendRequest = async (requestId: string, accept: boolean) => {
        const { error } = await supabase
            .from("friend_requests")
            .update({ status: accept ? "accepted" : "rejected" })
            .eq("id", requestId)

        if (error) {
            toast.error("Failed to update friend request")
            return
        }

        toast.success(accept ? "Friend request accepted!" : "Friend request declined")
        setFriendRequests(prev => prev.filter(req => req.id !== requestId))
    }

    const handleProjectInvitation = async (projectId: string, accept: boolean) => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        if (accept) {
            const { error } = await supabase
                .from("project_members")
                .update({ status: "active" })
                .eq("project_id", projectId)
                .eq("user_id", session.user.id)

            if (error) {
                toast.error("Failed to accept invitation")
                return
            }

            toast.success("Project invitation accepted!")
        } else {
            const { error } = await supabase
                .from("project_members")
                .delete()
                .eq("project_id", projectId)
                .eq("user_id", session.user.id)

            if (error) {
                toast.error("Failed to decline invitation")
                return
            }

            toast.success("Project invitation declined")
        }

        setProjectInvitations(prev => prev.filter(inv => inv.project_id !== projectId))
    }

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const totalNotifications = friendRequests.length + projectInvitations.length

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            <FloatingNav />

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
                                                    Sent you a friend request
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleFriendRequest(request.id, false)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleFriendRequest(request.id, true)}
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
                    {projectInvitations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FolderPlus className="h-5 w-5" />
                                    Project Invitations
                                    <Badge variant="secondary">{projectInvitations.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {projectInvitations.map(invitation => (
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
                                                    Invited by {invitation.project.owner.display_name || invitation.project.owner.username} as{" "}
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
