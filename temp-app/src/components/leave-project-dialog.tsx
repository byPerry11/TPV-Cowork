"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
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
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // Update status to 'left' instead of hard delete to keep history/references
            const { error } = await supabase
                .from('project_members')
                .update({ status: 'left' })
                .eq('project_id', projectId)
                .eq('user_id', session.user.id)

            if (error) throw error

            toast.success(`You have left ${projectTitle}`)
            setOpen(false)
            router.push('/dashboard')
            router.refresh()

            // Here you would add the notification logic to admins
            // For now we'll just log it
            console.log(`User ${session.user.id} left project ${projectId}`)

        } catch (error: any) {
            toast.error("Failed to leave project")
            console.error(error)
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
