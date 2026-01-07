"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, User, FileText, Calendar } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Maximize2 } from "lucide-react"

interface EvidenceViewerProps {
    checkpointId: string
    userRole: string | null
}

interface EvidenceRecord {
    id: string
    note: string | null
    image_url: string | null
    created_at: string
    profiles: {
        username: string | null
    }
}

export function EvidenceViewer({ checkpointId, userRole }: EvidenceViewerProps) {
    const [evidence, setEvidence] = useState<EvidenceRecord | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchEvidence = async () => {
            try {
                const { data, error } = await supabase
                    .from('evidences')
                    .select(`
                    id,
                    note,
                    image_url,
                    created_at,
                    profiles:user_id (
                        username
                    )
                `)
                    .eq('checkpoint_id', checkpointId)
                    .single()

                if (error) {
                    // If no single record found (or RLS issue), handle gracefully
                    console.warn("Could not fetch evidence:", error)
                    setLoading(false)
                    return
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setEvidence(data as any) // Type assertion due to join complexity
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        fetchEvidence()
    }, [checkpointId])

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!evidence) {
        return (
            <div className="text-center p-8 text-muted-foreground">
                No evidence found for this checkpoint.
            </div>
        )
    }

    return (
        <div className="space-y-6 pt-4">
            {/* Evidence Image with Fullscreen */}
            {evidence.image_url ? (
                <Dialog>
                    <DialogTrigger asChild>
                        <Card className="max-w-sm md:max-w-md lg:max-w-lg mx-auto cursor-pointer hover:shadow-lg transition-shadow group overflow-hidden">
                            <CardContent className="p-0 relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={evidence.image_url}
                                    alt="Evidence"
                                    className="w-full h-auto object-cover aspect-video rounded-md"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </CardContent>
                        </Card>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl w-full p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={evidence.image_url}
                            alt="Evidence Fullscreen"
                            className="w-full h-auto object-contain max-h-[85vh] rounded-md"
                        />
                    </DialogContent>
                </Dialog>
            ) : (
                <Card className="max-w-sm md:max-w-md mx-auto">
                    <CardContent className="p-8 text-center text-muted-foreground">
                        No image attached
                    </CardContent>
                </Card>
            )}

            {/* Notes Section - Compact */}
            <div className="space-y-2">
                <h4 className="flex items-center gap-2 font-medium text-sm">
                    <FileText className="h-4 w-4" />
                    Notes
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                    {evidence.note || "No notes provided."}
                </p>
            </div>

            <Separator />

            {/* Admin Review Section */}
            <ReviewSection checkpointId={checkpointId} userRole={userRole} />

            <Separator /> 
            
            <div className="flex flex-col gap-1 text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span>Submitted by: <span className="font-medium text-foreground">{evidence.profiles?.username || "Unknown"}</span></span>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>{evidence.created_at ? new Date(evidence.created_at).toLocaleString() : "Unknown"}</span>
                </div>
            </div>
        </div>
    )
}

function ReviewSection({ checkpointId, userRole }: { checkpointId: string, userRole: string | null }) {
    const [rating, setRating] = useState<string>("")
    const [comment, setComment] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [hasReview, setHasReview] = useState(false)

    // Check if user can edit
    const canEdit = userRole === 'admin' || userRole === 'manager'

    useEffect(() => {
        const fetchReview = async () => {
            const { data, error } = await supabase
                .from('checkpoints')
                .select('rating, admin_comment')
                .eq('id', checkpointId)
                .single()
            
            if (data) {
                if (data.rating !== null || data.admin_comment) {
                    setHasReview(true)
                    setRating(data.rating?.toString() || "")
                    setComment(data.admin_comment || "")
                }
            }
        }
        fetchReview()
    }, [checkpointId])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const numRating = parseFloat(rating)
            if (isNaN(numRating) || numRating < 1 || numRating > 10) {
                toast.error("Invalid Rating", { description: "Rating must be between 1.0 and 10.0" })
                setIsSaving(false)
                return
            }

            const { error } = await supabase
                .from('checkpoints')
                .update({ 
                    rating: numRating,
                    admin_comment: comment
                 })
                .eq('id', checkpointId)

            if (error) throw error
            
            toast.success("Review saved")
            setHasReview(true)
            setIsEditing(false)
        } catch (error) {
            toast.error("Failed to save review")
            console.error(error)
        } finally {
            setIsSaving(false)
        }
    }

    if (!hasReview && !canEdit) return null

    if (hasReview && !isEditing) {
        return (
            <div className="space-y-3 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-100 dark:border-yellow-900/50">
                <div className="flex items-center justify-between">
                    <h4 className="font-semibold flex items-center gap-2 text-yellow-800 dark:text-yellow-500">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        Manager Review
                    </h4>
                    {canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
                    )}
                </div>
                <div className="flex items-center gap-4">
                     <div className="bg-white dark:bg-black/20 rounded px-3 py-1 font-bold text-lg border">
                        {rating} <span className="text-xs text-muted-foreground font-normal">/ 10</span>
                     </div>
                </div>
                {comment && (
                    <p className="text-sm italic text-muted-foreground">
                        "{comment}"
                    </p>
                )}
            </div>
        )
    }

    // Edit Mode (Only for Admins/Managers)
    return (
        <div className="space-y-4 border p-4 rounded-md bg-muted/30">
            <h4 className="font-medium">Manager Review</h4>
            <div className="grid gap-4">
                <div className="grid w-full max-w-xs items-center gap-1.5">
                    <label className="text-sm font-medium">Rating (1.0 - 10.0)</label>
                    <Input 
                        type="number" 
                        step="0.1" 
                        min="1" 
                        max="10" 
                        placeholder="10.0"
                        value={rating}
                        onChange={(e) => setRating(e.target.value)}
                    />
                </div>
                <div className="grid w-full gap-1.5">
                    <label className="text-sm font-medium">Comment</label>
                    <Textarea 
                        placeholder="Good job, but check..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 justify-end">
                    {hasReview && (
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    )}
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Review
                    </Button>
                </div>
            </div>
        </div>
    )
}
