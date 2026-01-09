"use client"

import { useState } from "react"
import { Bell, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNotifications } from "@/hooks/useNotifications"

export function NotificationsPopover({ children }: { children?: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const { 
        loading, 
        unreadCount, 
        friendRequests, 
        projectInvites, 
        rejectedCheckpoints,
        refresh,
        handleFriendResponse,
        handleProjectInvitation
    } = useNotifications()

    // Trigger refresh when opening
    const onOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (isOpen) refresh()
    }

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                {children || (
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-600 border border-background" />
                        )}
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h4 className="font-semibold">Notifications</h4>
                    {unreadCount > 0 && <Badge variant="secondary">{unreadCount}</Badge>}
                </div>
                
                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                         <TabsTrigger value="all" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">All</TabsTrigger>
                    </TabsList>
                    <ScrollArea className="h-[300px]">
                        {loading && (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {!loading && unreadCount === 0 && (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
                                <Bell className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-sm">No new notifications</p>
                            </div>
                        )}
                        
                        <div className="p-0">
                            {/* Rejected Checkpoints */}
                            {rejectedCheckpoints.map((checkpoint) => (
                                <div key={checkpoint.id} className="flex flex-col p-4 border-b hover:bg-muted/50 bg-red-50 dark:bg-red-950/10">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-red-700 dark:text-red-400">Checkpoint Rejected ❌</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                <strong>{checkpoint.project.title}</strong> - {checkpoint.title}
                                            </p>
                                            <p className="text-xs mt-1 font-medium">Rating: {checkpoint.rating}/10</p>
                                            {checkpoint.rejection_reason && (
                                                <p className="text-xs text-muted-foreground mt-1 italic">
                                                    "{checkpoint.rejection_reason}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

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
                                        <Button size="sm" className="w-full h-8" onClick={() => handleProjectInvitation(invite.project_id, true)}>
                                            Accept
                                        </Button>
                                        <Button size="sm" variant="outline" className="w-full h-8" onClick={() => handleProjectInvitation(invite.project_id, false)}>
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
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleFriendResponse(req.id, true)}>
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => handleFriendResponse(req.id, false)}>
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
