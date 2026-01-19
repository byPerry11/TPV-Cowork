"use client"

import { useState } from "react"
import { Task, Role } from "@/types"
import { updateTaskStatus, deleteTask, leaveTask } from "@/app/actions/tasks"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { MoreVertical, Edit, Trash2, CheckCircle, Clock, PlayCircle, LogOut } from "lucide-react"

interface TaskActionsMenuProps {
    task: Task
    currentUserId: string
    userRole: Role | null
    onUpdate: () => void
    onEdit?: () => void
}

export function TaskActionsMenu({ task, currentUserId, userRole, onUpdate, onEdit }: TaskActionsMenuProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const isAdmin = userRole === 'admin' || userRole === 'manager'
    const isAssigned = task.assignments.some(a => a.user_id === currentUserId)
    const canChangeStatus = isAdmin || isAssigned

    const handleStatusChange = async (newStatus: Task['status']) => {
        try {
            const result = await updateTaskStatus({
                task_id: task.id,
                status: newStatus,
            })

            if (!result.success) {
                toast.error(result.error)
                return
            }

            toast.success("Estado actualizado exitosamente")
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error("Error al actualizar el estado")
        }
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteTask(task.id)

            if (!result.success) {
                toast.error(result.error)
                return
            }

            toast.success("Tarea eliminada exitosamente")
            setShowDeleteDialog(false)
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error("Error al eliminar la tarea")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleLeave = async () => {
        try {
            const result = await leaveTask(task.id)

            if (!result.success) {
                toast.error(result.error)
                return
            }

            toast.success("Saliste de la tarea exitosamente")
            onUpdate()
        } catch (error) {
            console.error(error)
            toast.error("Error al salir de la tarea")
        }
    }

    // Si no tiene permisos para ninguna acción, no mostrar el menú
    if (!isAdmin && !canChangeStatus && !(task.is_free && isAssigned)) {
        return null
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Cambiar Estado */}
                    {canChangeStatus && (
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Clock className="mr-2 h-4 w-4" />
                                Cambiar Estado
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem
                                    onClick={() => handleStatusChange('pending')}
                                    disabled={task.status === 'pending'}
                                >
                                    <Clock className="mr-2 h-4 w-4" />
                                    Pendiente
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleStatusChange('in_progress')}
                                    disabled={task.status === 'in_progress'}
                                >
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                    En Progreso
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleStatusChange('completed')}
                                    disabled={task.status === 'completed'}
                                >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Completada
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    )}

                    {/* Editar (solo admins/managers) */}
                    {isAdmin && onEdit && (
                        <DropdownMenuItem onClick={onEdit}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                        </DropdownMenuItem>
                    )}

                    {/* Salir de tarea libre */}
                    {task.is_free && isAssigned && (
                        <DropdownMenuItem onClick={handleLeave}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Salir de Tarea
                        </DropdownMenuItem>
                    )}

                    {/* Eliminar (solo admins/managers) */}
                    {isAdmin && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setShowDeleteDialog(true)}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Diálogo de confirmación de eliminación */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente la tarea
                            <span className="font-semibold"> "{task.title}"</span> y todas sus asignaciones.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
