"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, User, FileText, Calendar } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"

interface EvidenceViewerProps {
    checkpointId: string
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

export function EvidenceViewer({ checkpointId }: EvidenceViewerProps) {
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
        {evidence.image_url ? (
            <div className="rounded-lg border overflow-hidden bg-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                    src={evidence.image_url} 
                    alt="Evidence" 
                    className="w-full h-auto object-cover max-h-[400px]" 
                />
            </div>
        ) : (
            <div className="p-8 border rounded-lg border-dashed text-center text-muted-foreground">
                No image attached
            </div>
        )}

        <div className="space-y-4">
            <h4 className="flex items-center gap-2 font-medium">
                <FileText className="h-4 w-4" />
                Notes
            </h4>
            <div className="p-3 bg-muted rounded-md text-sm">
                {evidence.note || "No notes provided."}
            </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Submitted by: <span className="font-medium text-foreground">{evidence.profiles?.username || "Unknown"}</span></span>
            </div>
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Date: {evidence.created_at ? new Date(evidence.created_at).toLocaleString() : "Unknown"}</span>
            </div>
        </div>
    </div>
  )
}
