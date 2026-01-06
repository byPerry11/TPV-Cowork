"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Checkpoint } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Circle, Camera } from "lucide-react"
import { EvidenceForm } from "@/components/evidence-form"
import { EvidenceViewer } from "@/components/evidence-viewer"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface CheckpointListProps {
  projectId: string
}

export function CheckpointList({ projectId }: CheckpointListProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null)
  
  // Fetch checkpoints
  const fetchCheckpoints = async () => {
      try {
        const { data, error } = await supabase
          .from("checkpoints")
          .select("*")
          .eq("project_id", projectId)
          .order("order", { ascending: true })

        if (error) {
            console.error("Error fetching checkpoints:", error)
            return
        }
        setCheckpoints(data || [])
      } catch (err) {
          console.error(err)
      } finally {
          setLoading(false)
      }
  }

  useEffect(() => {
    fetchCheckpoints()
  }, [projectId])

  if (loading) {
      return <div>Loading tasks...</div>
  }

  if (checkpoints.length === 0) {
      return (
          <div className="text-center p-8 text-gray-500">
              No checkpoints defined for this project.
          </div>
      )
  }

  return (
    <div className="space-y-4">
      {checkpoints.map((checkpoint) => (
        <Card key={checkpoint.id} className={`${checkpoint.is_completed ? 'opacity-80' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">
                {checkpoint.title}
            </CardTitle>
            {checkpoint.is_completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
                <Circle className="h-5 w-5 text-gray-300" />
            )}
          </CardHeader>
          <CardContent>
            <div className="flex justify-end pt-2">
                 <Sheet>
                    <SheetTrigger asChild>
                        <Button 
                            variant={checkpoint.is_completed ? "outline" : "default"} 
                            size="sm"
                            onClick={() => setSelectedCheckpoint(checkpoint)}
                        >
                            <Camera className="mr-2 h-4 w-4" />
                            {checkpoint.is_completed ? "View Evidence" : "Add Evidence"}
                        </Button>
                    </SheetTrigger>
                    
                    <SheetContent side="bottom" className="h-[90vh]">
                        <SheetHeader>
                            <SheetTitle>
                                {selectedCheckpoint?.is_completed 
                                    ? `Evidence: ${selectedCheckpoint.title}`
                                    : `Submit Evidence: ${selectedCheckpoint?.title}`
                                }
                            </SheetTitle>
                        </SheetHeader>
                        {selectedCheckpoint && (
                            selectedCheckpoint.is_completed ? (
                                <EvidenceViewer checkpointId={selectedCheckpoint.id} />
                            ) : (
                                <EvidenceForm 
                                    checkpointId={selectedCheckpoint.id} 
                                    onSuccess={() => {
                                        fetchCheckpoints() 
                                    }}
                                />
                            )
                        )}
                    </SheetContent>
                 </Sheet>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
