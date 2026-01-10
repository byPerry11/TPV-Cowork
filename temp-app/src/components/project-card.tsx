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
    membershipStatus = "active",
    onRespond
}: ProjectCardProps) {
    const isPending = membershipStatus === "pending"
    const roleColors = {
        admin: "bg-purple-500",
        manager: "bg-blue-500",
        member: "bg-gray-500"
    }

    const statusColors = {
        active: "text-green-600",
        completed: "text-gray-600",
        archived: "text-orange-600"
    }

    // Get category info
    const categoryInfo = ENGINEERING_CATEGORIES.find(cat => cat.value === category)

    return (
        <Link href={`/projects/${id}`}>
            <Card
                className={`transition-all duration-200 cursor-pointer border-l-4 h-full relative group ${isPending ? 'border-l-gray-300 opacity-90' : 'hover:shadow-lg'}`}
                style={{ borderLeftColor: isPending ? undefined : (color || undefined) }}
            >
                {/* Pending Notification Dot */}
                {isPending && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 border-2 border-background z-10 animate-pulse" />
                )}

                <CardContent className="p-4 space-y-3 relative">
                    {/* Pending Overlay Actions */}
                    {isPending && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center gap-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity p-4 text-center">
                            <p className="text-sm font-semibold">Join this project?</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (onRespond) onRespond(false)
                                    }}
                                    className="h-8 px-3 rounded-md bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors"
                                >
                                    Decline
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (onRespond) onRespond(true)
                                    }}
                                    className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                                >
                                    Accept
                                </button>
                            </div>
                        </div>
                    )}
                    {/* Header with Icon */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-2xl flex-shrink-0">{project_icon}</span>
                            <h3 className="font-semibold truncate">{title}</h3>
                        </div>
                        <Badge
                            variant="secondary"
                            className={`${roleColors[role]} text-white text-xs flex-shrink-0`}
                        >
                            {role}
                        </Badge>
                    </div>

                    {/* Category Badge */}
                    {categoryInfo && (
                        <div>
                            <Badge variant="outline" className="text-xs">
                                {categoryInfo.emoji} {categoryInfo.label}
                            </Badge>
                        </div>
                    )}

                    {/* Description */}
                    {description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                            {description}
                        </p>
                    )}

                    {/* Progress */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                        </div>
                        <Badge variant="outline" className={`capitalize text-xs ${statusColors[status]}`}>
                            {status}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
