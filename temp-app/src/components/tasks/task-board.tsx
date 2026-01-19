"use client"

import { useState } from "react"
import { joinTask } from "@/app/actions/tasks"
import { useDroppable } from "@dnd-kit/core"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { Task } from "@/types"
import { TaskStatusBadge } from "@/components/tasks/task-status-badge"
import { TaskActionsMenu } from "@/components/tasks/task-actions-menu"

interface TaskBoardProps {
    groupId: string
    userId: string
    userRole: 'admin' | 'manager' | 'member' | null
    tasks: Task[]
    onTaskUpdate: () => void
}

export function TaskBoard({ groupId, userId, userRole, tasks, onTaskUpdate }: TaskBoardProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
                <TaskCard
                    key={task.id}
                    task={task}
                    currentUserId={userId}
                    userRole={userRole}
                    onUpdate={onTaskUpdate}
                />
            ))}
        </div>
    )
}

function TaskCard({ task, currentUserId, userRole, onUpdate }: { task: Task, currentUserId: string, userRole: 'admin' | 'manager' | 'member' | null, onUpdate: () => void }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `task-${task.id}`,
        data: {
            type: 'Task',
            task: task,
        },
    })

    const [isJoining, setIsJoining] = useState(false)

    const handleJoin = async () => {
        setIsJoining(true)
        try {
            const result = await joinTask(task.id)

            if (!result.success) {
                toast.error(result.error)
                return
            }

            toast.success("Te uniste a la tarea exitosamente")
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado al unirse a la tarea")
        } finally {
            setIsJoining(false)
        }
    }

    const isAssigned = task.assignments.some(a => a.user_id === currentUserId)
    const isFull = task.is_free && task.member_limit ? task.assignments.length >= task.member_limit : false

    return (
        <Card
            ref={setNodeRef}
            className={cn(
                "transition-colors",
                isOver ? "border-primary bg-primary/5" : ""
            )}
        >
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold line-clamp-1">{task.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                            <TaskStatusBadge status={task.status} />
                            {task.is_free && (
                                <Badge variant="secondary" className="text-xs">
                                    Libre ({task.assignments.length}/{task.member_limit || '∞'})
                                </Badge>
                            )}
                        </div>
                    </div>
                    <TaskActionsMenu
                        task={task}
                        currentUserId={currentUserId}
                        userRole={userRole}
                        onUpdate={onUpdate}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {task.description || "No description"}
                </p>

                {/* Assigned Members */}
                <div className="flex -space-x-2 overflow-hidden">
                    {task.assignments.length > 0 ? (
                        task.assignments.map((assignment) => (
                            <Avatar key={assignment.user_id} className="inline-block border-2 border-background w-8 h-8">
                                <AvatarImage src={assignment.user.avatar_url} />
                                <AvatarFallback>{assignment.user.username[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                        ))
                    ) : (
                        <span className="text-xs text-muted-foreground italic h-8 flex items-center">No members assigned</span>
                    )}
                </div>

                {/* Actions */}
                {task.is_free && !isAssigned && !isFull && (
                    <Button size="sm" variant="outline" className="w-full" onClick={handleJoin} disabled={isJoining}>
                        {isJoining ? "Uniéndose..." : "Unirse a Tarea"}
                    </Button>
                )}
                {task.is_free && isAssigned && (
                    <Button size="sm" variant="secondary" className="w-full" disabled>
                        Unido
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}
