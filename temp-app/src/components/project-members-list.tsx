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
    } | null
}

interface ProjectMembersListProps {
    members: ProjectMember[]
    currentUserId: string
}

export function ProjectMembersList({ members, currentUserId }: ProjectMembersListProps) {
    const router = useRouter()
    const activeMembers = members.filter(m => m.status === 'active' || m.status === 'pending')

    return (
        <Card className="">
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex justify-between items-center text-base">
                    Team
                    <Badge variant="secondary" className="text-xs h-5 px-1">{activeMembers.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                <ScrollArea className="h-[120px] pr-3">
                    <div className="space-y-3">
                        {activeMembers.map((member) => {
                            // Enforce purlple for admin
                            const memberColor = member.role === 'admin' ? '#a855f7' : (member.member_color || '#808080')

                            return (
                                <div key={member.user_id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => router.push(member.user_id === currentUserId ? '/profile' : `/users/${member.user_id}`)}
                                        >
                                            <div className="relative">
                                                <Avatar
                                                    className="h-7 w-7 border-2"
                                                    style={{ borderColor: memberColor }}
                                                >
                                                    <AvatarImage src={member.profile?.avatar_url || ""} />
                                                    <AvatarFallback className="text-[10px]">
                                                        <User className="h-3 w-3" />
                                                    </AvatarFallback>
                                                </Avatar>
                                                {member.role === 'admin' && (
                                                    <Crown className="h-2.5 w-2.5 text-yellow-500 absolute -top-1 -right-1 bg-background rounded-full" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs font-medium leading-none truncate max-w-[80px]">
                                                        {member.profile?.display_name || member.profile?.username || "Unknown User"}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground capitalize leading-none">
                                                    {member.role}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {member.status === 'pending' && (
                                        <Badge variant="outline" className="text-[10px] px-1 h-4 text-yellow-600 border-yellow-200 bg-yellow-50">
                                            Pending
                                        </Badge>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
