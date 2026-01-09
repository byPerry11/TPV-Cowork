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
import { Trash2, Loader2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DeleteProjectDialogProps {
    projectId: string
    projectTitle: string
}

export function DeleteProjectDialog({ projectId, projectTitle }: DeleteProjectDialogProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [confirmTitle, setConfirmTitle] = useState("")
    const router = useRouter()

    const handleDeleteProject = async () => {
        if (confirmTitle !== projectTitle) return

        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', projectId)

            if (error) throw error

            toast.success("Project deleted successfully")
            setOpen(false)
            router.push('/dashboard')

        } catch (error: any) {
            toast.error("Failed to delete project", {
                description: error.message
            })
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Project
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <DialogTitle>Delete Project</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        This action cannot be undone. This will permanently delete the
                        project <strong>{projectTitle}</strong> and remove all associated data,
                        including members, checkpoints, and evidences.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Type the project name to confirm</Label>
                        <Input
                            value={confirmTitle}
                            onChange={(e) => setConfirmTitle(e.target.value)}
                            placeholder={projectTitle}
                            className="font-mono"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDeleteProject}
                        disabled={isLoading || confirmTitle !== projectTitle}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        I understand, delete this project
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
