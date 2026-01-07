"use client"

import { useState, useEffect } from "react"
import { Bell, Check, X, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FriendRequest {
    id: string
    sender: { username: string, display_name: string | null, avatar_url: string | null }
}

interface ProjectInvite {
    project_id: string
    project: { title: string }
    invited_by_profile: { username: string, display_name: string | null } // Assuming we track who invited, but for now we might just show project name
}

export function NotificationsPopover() {
    const [open, setOpen] = useState(false)
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [projectInvites, setProjectInvites] = useState<any[]>([]) 
    const [count, setCount] = useState(0)
    const [loading, setLoading] = useState(false)

    const fetchNotifications = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Friend Requests
            const { data: frData } = await supabase
                .from('friend_requests')
                .select(`
                    id,
                    sender:sender_id(username, display_name, avatar_url)
                `)
                .eq('receiver_id', user.id)
                .eq('status', 'pending')
            
            setFriendRequests(frData as any || [])

            // 2. Project Invites (project_members where status = 'pending')
            // Note: We need to join projects to get title.
            const { data: piData, error: piError } = await supabase
                .from('project_members')
                .select(`
                    project_id,
                    project:project_id(title)
                `)
                .eq('user_id', user.id)
                .eq('status', 'pending')
            
            if (piError) console.error("Error fetching invites", piError)
            setProjectInvites(piData as any || [])

            setCount((frData?.length || 0) + (piData?.length || 0))

        } catch (error) {
            console.error("Error fetching notifications", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // Initial fetch
        fetchNotifications()

        // Realtime subscription could go here for 'friend_requests' and 'project_members'
        // For simplicity, we just fetch on open and periodic interval or mount.
        const interval = setInterval(fetchNotifications, 30000) // Poll every 30s
        return () => clearInterval(interval)
    }, [])

    const handleFriendResponse = async (id: string, status: 'accepted' | 'rejected') => {
        const { error } = await supabase.from('friend_requests').update({ status }).eq('id', id)
        if (error) {
            toast.error("Failed to update request")
        } else {
            toast.success(`Request ${status}`)
            fetchNotifications()
        }
    }

    const handleProjectResponse = async (projectId: string, status: 'active' | 'rejected') => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        if (status === 'rejected') {
             // Delete the row or mark rejected? marking rejected is better for history but delete is cleaner for "I don't want this"
             // Let's delete for rejected to keep it simple, or update status.
             // If we update to 'rejected', user won't see it anymore with our query.
             const { error } = await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', user.id)
             if (error) toast.error("Failed to reject")
             else {
                 toast.success("Invitation declined")
                 fetchNotifications()
             }
        } else {
            const { error } = await supabase.from('project_members').update({ status: 'active' }).eq('project_id', projectId).eq('user_id', user.id)
            if (error) toast.error("Failed to join project")
            else {
                toast.success("Joined project successfully")
                fetchNotifications()
                // Optionally redirect or refresh project list context
                window.location.reload()
            }
        }
    }

    return (
        <Popover open={open} onOpenChange={(o) => {
            setOpen(o)
            if (o) fetchNotifications()
        }}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {count > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-600 border border-background" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h4 className="font-semibold">Notifications</h4>
                    {count > 0 && <Badge variant="secondary">{count}</Badge>}
                </div>
                
                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                         <TabsTrigger value="all" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">All</TabsTrigger>
                         {/* We could split Invitations and Requests if we had many */}
                    </TabsList>
                    <ScrollArea className="h-[300px]">
                        {loading && (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {!loading && count === 0 && (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
                                <Bell className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-sm">No new notifications</p>
                            </div>
                        )}
                        
                        <div className="p-0">
                            {/* Project Invites */}
                            {projectInvites.map((invite) => (
                                <div key={invite.project_id} className="flex flex-col p-4 border-b hover:bg-muted/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-sm font-medium">Project Invitation</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                You have been invited to join <strong>{invite.project.title}</strong>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <Button size="sm" className="w-full h-8" onClick={() => handleProjectResponse(invite.project_id, 'active')}>
                                            Accept
                                        </Button>
                                        <Button size="sm" variant="outline" className="w-full h-8" onClick={() => handleProjectResponse(invite.project_id, 'rejected')}>
                                            Decline
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {/* Friend Requests */}
                            {friendRequests.map((req) => (
                                <div key={req.id} className="flex items-center justify-between p-4 border-b hover:bg-muted/50">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{req.sender.display_name || req.sender.username}</span>
                                        <span className="text-xs text-muted-foreground">sent a friend request</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleFriendResponse(req.id, 'accepted')}>
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => handleFriendResponse(req.id, 'rejected')}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </Tabs>
            </PopoverContent>
        </Popover>
    )
}
