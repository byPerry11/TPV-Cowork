"use client"

import { Task } from "@/types"
import { Badge } from "@/components/ui/badge"

interface TaskStatusBadgeProps {
    status: Task['status']
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
    const variants = {
        pending: { variant: "secondary" as const, label: "Pendiente" },
        in_progress: { variant: "default" as const, label: "En Progreso" },
        completed: { variant: "outline" as const, label: "Completada" },
    }

    const config = variants[status]

    return (
        <Badge variant={config.variant} className={status === 'completed' ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100' : ''}>
            {config.label}
        </Badge>
    )
}
