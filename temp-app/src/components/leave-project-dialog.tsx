"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { LogOut, Loader2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { leaveProject } from "@/app/actions/members"

interface LeaveProjectDialogProps {
    projectId: string
    projectTitle: string
}

export function LeaveProjectDialog({ projectId, projectTitle }: LeaveProjectDialogProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleLeaveProject = async () => {
        setIsLoading(true)
        try {
            const result = await leaveProject({ project_id: projectId })

            if (!result.success) {
                toast.error('Error al salir del proyecto', {
                    description: result.error,
                })
                return
            }

            toast.success(`Has salido de ${projectTitle}`)
            setOpen(false)
            router.push('/dashboard')
            router.refresh()
        } catch (error) {
            console.error('Unexpected error:', error)
            toast.error('Error inesperado al salir del proyecto')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Leave Project
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <DialogTitle>Leave Project</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        Are you sure you want to leave <strong>{projectTitle}</strong>?
                        <br />
                        You will lose access to all project checkpoints and chats.
                        <br />
                        This action will notify the project administrators.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleLeaveProject}
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Yes, Leave Project
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
