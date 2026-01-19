"use client"

import { useState, useEffect } from "react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, Loader2, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { completeProject } from "@/app/actions/projects"
import { supabase } from "@/lib/supabaseClient"

interface ProjectCompletionDialogProps {
    projectId: string
    projectTitle: string
    onCompleted: () => void
}

interface EvidenceSummary {
    checkpoint_title: string
    note: string | null
    image_url: string | null
    submitted_by_name: string
}

export function ProjectCompletionDialog({ projectId, projectTitle, onCompleted }: ProjectCompletionDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [completing, setCompleting] = useState(false)
    const [summary, setSummary] = useState<EvidenceSummary[]>([])

    useEffect(() => {
        if (open) {
            fetchSummary()
        }
    }, [open])

    const fetchSummary = async () => {
        setLoading(true)
        try {
            // Get all checkpoints + evidence for this project
            const { data: checkpoints, error } = await supabase
                .from('checkpoints')
                .select(`
                    title,
                    is_completed,
                    evidences (
                        note,
                        image_url,
                        user_id
                    )
                `)
                .eq('project_id', projectId)
                .eq('is_completed', true)

            if (error) throw error

            if (checkpoints) {
                // For each evidence, fetch the user profile to get the name
                // This is a bit inefficient (N+1), but simple for now. 
                // A better way is a proper join if relationships allow, or fetching all profiles in one go.
                const processed = await Promise.all(checkpoints.map(async (cp) => {
                    const evidence = cp.evidences?.[0] // Assuming 1 evidence per checkpoint for now
                    if (!evidence) return null

                    let submittedByName = "Unknown"
                    if (evidence.user_id) {
                        const { data: profile } = await supabase.from('profiles').select('display_name, username').eq('id', evidence.user_id).single()
                        submittedByName = profile?.display_name || profile?.username || "Unknown"
                    }

                    return {
                        checkpoint_title: cp.title,
                        note: evidence.note,
                        image_url: evidence.image_url,
                        submitted_by_name: submittedByName
                    } as EvidenceSummary
                }))

                setSummary(processed.filter(Boolean) as EvidenceSummary[])
            }
        } catch (error) {
            console.error("Error fetching project summary", error)
            toast.error("Failed to load project summary")
        } finally {
            setLoading(false)
        }
    }

    const handleCompleteProject = async () => {
        setCompleting(true)
        try {
            const result = await completeProject({
                project_id: projectId,
                completion_date: new Date().toISOString(),
            })

            if (!result.success) {
                toast.error('Error al completar proyecto', {
                    description: result.error,
                })
                return
            }

            toast.success('¡Proyecto marcado como completado!')
            setOpen(false)
            onCompleted()
        } catch (error) {
            console.error('Unexpected error:', error)
            toast.error('Error inesperado')
        } finally {
            setCompleting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Finish Project
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Project Completion Review</DialogTitle>
                    <DialogDescription>
                        Review all gathered evidence for {projectTitle} before closing the project.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden min-h-[300px] border rounded-md relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <ScrollArea className="h-full max-h-[500px] p-4">
                            {summary.length === 0 ? (
                                <p className="text-center text-muted-foreground my-10">No evidence found.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {summary.map((item, idx) => (
                                        <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-sm truncate w-2/3" title={item.checkpoint_title}>
                                                    {item.checkpoint_title}
                                                </h4>
                                                <span className="text-xs text-muted-foreground">{item.submitted_by_name}</span>
                                            </div>

                                            {item.image_url ? (
                                                <div className="aspect-video relative rounded-md overflow-hidden bg-black/5 border">
                                                    {/* Using regular img for external Supabase URLs to avoid Next.js config hassle immediately */}
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={item.image_url}
                                                        alt="Evidence"
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="aspect-video flex items-center justify-center bg-muted rounded-md text-muted-foreground text-xs">
                                                    <ImageIcon className="h-6 w-6 mb-1 opacity-50" />
                                                    No Image
                                                </div>
                                            )}

                                            {item.note && (
                                                <p className="text-xs text-muted-foreground bg-muted p-2 rounded italic">
                                                    "{item.note}"
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleCompleteProject}
                        disabled={loading || completing}
                    >
                        {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Completion
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
