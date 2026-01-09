"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, User, Crown, Shield } from "lucide-react"

interface ProjectMember {
    user_id: string
    role: "admin" | "manager" | "member"
    status: "pending" | "active" | "rejected" | "left"
    member_color: string
    profile: {
        username: string | null
        display_name: string | null
        avatar_url: string | null
    }
}

interface ProjectMembersListProps {
    members: ProjectMember[]
    currentUserId: string
}

export function ProjectMembersList({ members, currentUserId }: ProjectMembersListProps) {
    const activeMembers = members.filter(m => m.status === 'active' || m.status === 'pending')

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-center text-lg">
                    Team Members
                    <Badge variant="secondary">{activeMembers.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                        {activeMembers.map((member) => (
                            <div key={member.user_id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Avatar
                                            className="h-9 w-9 border-2"
                                            style={{ borderColor: member.member_color || '#808080' }}
                                        >
                                            <AvatarImage src={member.profile.avatar_url || ""} />
                                            <AvatarFallback>
                                                <User className="h-4 w-4" />
                                            </AvatarFallback>
                                        </Avatar>
                                        {member.role === 'admin' && (
                                            <Crown className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1 bg-background rounded-full" />
                                        )}
                                        {member.role === 'manager' && (
                                            <Shield className="h-3 w-3 text-blue-500 absolute -top-1 -right-1 bg-background rounded-full" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium leading-none">
                                                {member.profile.display_name || member.profile.username}
                                            </span>
                                            {member.user_id === currentUserId && (
                                                <span className="text-xs text-muted-foreground">(You)</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground capitalize">
                                            {member.role}
                                        </span>
                                    </div>
                                </div>
                                {member.status === 'pending' && (
                                    <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-200 bg-yellow-50">
                                        Pending
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
