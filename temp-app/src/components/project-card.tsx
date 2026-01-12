"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { Users } from "lucide-react"
import { ENGINEERING_CATEGORIES } from "@/lib/project-constants"

interface ProjectCardProps {
    id: string
    title: string
    description?: string | null
    category?: string | null
    color?: string | null
    project_icon?: string | null
    progress: number
    role: "admin" | "manager" | "member"
    status: "active" | "completed" | "archived"
    memberCount?: number
    membershipStatus?: "active" | "pending" | "rejected"
    members?: { avatar_url: string | null }[]
    onRespond?: (accept: boolean) => void
}

export function ProjectCard({
    id,
    title,
    description,
    category,
    color = "#6366f1",
    project_icon = "📁",
    progress,
    role,
    status,
    memberCount = 1,
    members = [],
    membershipStatus = "active",
    onRespond
}: ProjectCardProps) {
    const isPending = membershipStatus === "pending"
    // ... existing ...
    
    // ... render ...

                        {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                        <div className="flex items-center">
                            {/* Stacked Avatars */}
                            <div className="flex -space-x-2 mr-2">
                                {members.slice(0, 3).map((m, i) => (
                                    <div key={i} className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-200 overflow-hidden z-[1]">
                                        {m.avatar_url ? (
                                            <img src={m.avatar_url} alt="member" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-primary/10 text-[8px] font-bold text-primary">
                                                U
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {memberCount > 3 && (
                                    <div className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[9px] font-medium z-[0]">
                                        +{memberCount - 3}
                                    </div>
                                )}
                            </div>
                            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                        </div>
                        <Badge variant="outline" className={`capitalize text-xs ${statusColors[status]}`}>
                            {status}
                        </Badge>
                    </div>

                    {/* Mobile Only Pending Actions (Inline) */}
                    {isPending && (
                        <div className="md:hidden pt-4 mt-2 border-t flex flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (onRespond) onRespond(false)
                                }}
                                className="flex-1 h-9 rounded-md bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors border border-destructive/20"
                            >
                                Decline
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (onRespond) onRespond(true)
                                }}
                                className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                Accept
                            </button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </CardWrapper>
    )
}
