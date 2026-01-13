"use client"

import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { User, Crown } from "lucide-react"
import { ManageMembersDialog } from "@/components/manage-members-dialog"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

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
    projectId: string
    userRole: string | null
}

function DraggableMemberItem({ member, currentUserId, canDrag }: { member: ProjectMember, currentUserId: string, canDrag: boolean }) {
    const router = useRouter()

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `member-${member.user_id}`,
        data: {
            type: 'member',
            memberId: member.user_id,
            memberProfile: member.profile
        },
        disabled: !canDrag
    })

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 999,
        position: 'relative' as const,
    } : undefined

    const memberColor = member.role === 'admin' ? '#a855f7' : (member.member_color || '#808080')

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            // If dragging, we can add some opacity or style
            className={`flex items-center justify-between p-1 rounded-md transition-all ${canDrag ? 'cursor-grab active:cursor-grabbing hover:bg-accent/50' : ''} ${isDragging ? 'opacity-50' : ''}`}
        >
            <div className="flex items-center gap-2 w-full">
                <div
                    className="flex items-center gap-2 w-full"
                    onClick={(e) => {
                        if (!transform) router.push(member.user_id === currentUserId ? '/profile' : `/users/${member.user_id}`)
                    }}
                >
                    <div className="relative shrink-0">
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
                    <div className="flex flex-col overflow-hidden">
                        <div className="flex items-center gap-1">
                            <span className="text-xs font-medium leading-none truncate max-w-[100px]">
                                {member.profile?.display_name || member.profile?.username || "Unknown User"}
                            </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground capitalize leading-none mt-0.5">
                            {member.role}
                        </span>
                    </div>
                </div>
            </div>
            {member.status === 'pending' && (
                <Badge variant="outline" className="text-[10px] px-1 h-4 text-yellow-600 border-yellow-200 bg-yellow-50 ml-auto">
                    Pending
                </Badge>
            )}
        </div>
    )
}

export function ProjectMembersList({ members, currentUserId, projectId, userRole }: ProjectMembersListProps) {
    const activeMembers = members.filter(m => m.status === 'active' || m.status === 'pending')

    // Only admins can assign members
    const canDrag = userRole === 'admin'

    return (
        <Card>
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex justify-between items-center text-base">
                    Team
                    <div className="flex items-center gap-1">
                        <ManageMembersDialog projectId={projectId} />
                        <Badge variant="secondary" className="text-xs h-5 px-1">{activeMembers.length}</Badge>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                <ScrollArea className="h-[120px] pr-3">
                    <div className="space-y-2 pt-2">
                        {activeMembers.map((member) => (
                            <DraggableMemberItem
                                key={member.user_id}
                                member={member}
                                currentUserId={currentUserId}
                                canDrag={canDrag}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
