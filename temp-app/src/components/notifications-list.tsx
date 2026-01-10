"use client"

import { useRouter } from "next/navigation"
import { Loader2, UserPlus, FolderPlus, Check, X, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/hooks/useNotifications"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NotificationsListProps {
    embedded?: boolean
}

export function NotificationsList({ embedded = false }: NotificationsListProps) {
    const router = useRouter()
    const {
        loading,
        friendRequests,
        projectInvites,
        rejectedCheckpoints,
        handleFriendResponse,
        handleProjectInvitation
    } = useNotifications()

    if (loading) {
        return (
            <div className="flex h-40 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const totalNotifications = friendRequests.length + projectInvites.length + rejectedCheckpoints.length

    if (totalNotifications === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Check className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-1">All caught up!</h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">
                    No new notifications.
                </p>
            </div>
        )
    }

    const Content = (
        <div className="space-y-6">
            {/* Rejected Checkpoints */}
            {rejectedCheckpoints.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 font-medium text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>Rejected Checkpoints</span>
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{rejectedCheckpoints.length}</Badge>
                    </div>
                    {rejectedCheckpoints.map(checkpoint => (
                        <Card key={checkpoint.id} className="border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/50">
                            <CardContent className="p-3 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium text-sm">{checkpoint.project?.title || "Unknown Project"}</p>
                                        <p className="text-xs text-muted-foreground">in <span className="font-medium">{checkpoint.title}</span></p>
                                    </div>
                                    <Badge variant="outline" className="text-xs border-red-200 text-red-600">{checkpoint.rating}/10</Badge>
                                </div>
                                {checkpoint.rejection_reason && (
                                    <p className="text-xs p-1.5 bg-red-100 dark:bg-red-900/40 rounded text-red-800 dark:text-red-300 italic">
                                        "{checkpoint.rejection_reason}"
                                    </p>
                                )}
                                <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={() => router.push(`/dashboard/projects/${checkpoint.project?.id}`)}>
                                    View Project
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Project Invitations - Pending */}
            {projectInvites.some(i => i.status === 'pending') && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 font-medium">
                        <FolderPlus className="h-4 w-4" />
                        <span>Project Invitations</span>
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            {projectInvites.filter(i => i.status === 'pending').length}
                        </Badge>
                    </div>
                    {projectInvites.filter(i => i.status === 'pending').map(invitation => (
                        <Card key={invitation.project_id}>
                            <CardContent className="p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                        <FolderPlus className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-medium truncate">
                                            {invitation.project?.title || "Private Project (Access Pending)"}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {invitation.project?.owner?.display_name ? `Invited by ${invitation.project.owner.display_name}` : "Invitation to private project"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleProjectInvitation(invitation.project_id, false)}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" className="h-7 w-7" onClick={() => handleProjectInvitation(invitation.project_id, true)}>
                                        <Check className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Friend Requests - Pending */}
            {friendRequests.some(r => r.status === 'pending') && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 font-medium">
                        <UserPlus className="h-4 w-4" />
                        <span>Friend Requests</span>
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            {friendRequests.filter(r => r.status === 'pending').length}
                        </Badge>
                    </div>
                    {friendRequests.filter(r => r.status === 'pending').map(request => (
                        <Card key={request.id}>
                            <CardContent className="p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <UserPlus className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-medium truncate">
                                            {request.sender?.display_name || request.sender?.username || "User"}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            @{request.sender?.username}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleFriendResponse(request.id, false)}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" className="h-7 w-7" onClick={() => handleFriendResponse(request.id, true)}>
                                        <Check className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* History Section */}
            {(friendRequests.some(r => r.status !== 'pending') || projectInvites.some(i => i.status !== 'pending')) && (
                <div className="pt-4 border-t space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">Recent History</h3>

                    {/* Historic Project Invites */}
                    {projectInvites.filter(i => i.status !== 'pending').map(invitation => (
                        <div key={invitation.project_id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 opacity-70">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                    <FolderPlus className="h-4 w-4 text-gray-500" />
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-medium truncate text-muted-foreground">
                                        {invitation.project?.title || "Private Project"}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {invitation.status === 'active' ? 'Joined' : 'Declined'} • {invitation.project?.owner?.display_name || "Unknown Owner"}
                                    </p>
                                </div>
                            </div>
                            <Badge variant={invitation.status === 'active' ? 'default' : 'destructive'} className="text-[10px] h-5">
                                {invitation.status === 'active' ? 'Accepted' : 'Declined'}
                            </Badge>
                        </div>
                    ))}

                    {/* Historic Friend Requests */}
                    {friendRequests.filter(r => r.status !== 'pending').map(request => (
                        <div key={request.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 opacity-70">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                    <UserPlus className="h-4 w-4 text-gray-500" />
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-medium truncate text-muted-foreground">
                                        {request.sender?.display_name || "User"}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {request.status === 'accepted' ? 'Friend Added' : 'Request Declined'}
                                    </p>
                                </div>
                            </div>
                            <Badge variant={request.status === 'accepted' ? 'default' : 'destructive'} className="text-[10px] h-5">
                                {request.status === 'accepted' ? 'Accepted' : 'Declined'}
                            </Badge>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

    if (embedded) {
        return (
            <ScrollArea className="h-[300px] pr-4">
                {Content}
            </ScrollArea>
        )
    }

    return Content
}
