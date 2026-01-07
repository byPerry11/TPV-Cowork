import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Checkpoint } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Circle, Camera, GripVertical } from "lucide-react"
import { EvidenceForm } from "@/components/evidence-form"
import { EvidenceViewer } from "@/components/evidence-viewer"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CheckpointListProps {
  projectId: string
  userRole: string | null
}

interface SortableCheckpointItemProps {
  checkpoint: Checkpoint
  onSelect: (checkpoint: Checkpoint) => void
  userRole: string | null
}

function SortableCheckpointItem({ checkpoint, onSelect, userRole }: SortableCheckpointItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: checkpoint.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="mb-4">
             <Card className={`${checkpoint.is_completed ? 'opacity-80' : ''}`}>
                <CardHeader className="flex flex-row items-center space-x-4 p-4 pb-2">
                    {/* Drag Handle */}
                    <div {...attributes} {...listeners} className="cursor-grab hover:text-primary touch-none">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 flex items-center justify-between">
                        <CardTitle className="text-base font-medium">
                            {checkpoint.title}
                        </CardTitle>
                        {checkpoint.is_completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                            <Circle className="h-5 w-5 text-gray-300" />
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 pl-14">
                    <div className="flex justify-end pt-2">
                         <Sheet>
                            <SheetTrigger asChild>
                                <Button 
                                    variant={checkpoint.is_completed ? "outline" : "default"} 
                                    size="sm"
                                    onClick={() => onSelect(checkpoint)}
                                >
                                    <Camera className="mr-2 h-4 w-4" />
                                    {checkpoint.is_completed ? "View Evidence" : "Add Evidence"}
                                </Button>
                            </SheetTrigger>
                            
                            <SheetContent side="bottom" className="h-[90vh]">
                                <SheetHeader>
                                    <SheetTitle>
                                        {checkpoint.is_completed 
                                            ? `Evidence: ${checkpoint.title}`
                                            : `Submit Evidence: ${checkpoint.title}`
                                        }
                                    </SheetTitle>
                                </SheetHeader>
                                {checkpoint.is_completed ? (
                                    <EvidenceViewer checkpointId={checkpoint.id} userRole={userRole} />
                                ) : (
                                    <EvidenceForm 
                                        checkpointId={checkpoint.id} 
                                        onSuccess={() => {
                                            // Ideally trigger a refresh, but for now we rely on the parent or context if needed
                                            // However, SortableItem doesn't easily pass this up without prop drilling refresh
                                            window.location.reload() // Simplest for now given context limits
                                        }}
                                    />
                                )}
                            </SheetContent>
                         </Sheet>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export function CheckpointList({ projectId, userRole }: CheckpointListProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(true)
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
        setCheckpoints((items) => {
            const oldIndex = items.findIndex((i) => i.id === active.id);
            const newIndex = items.findIndex((i) => i.id === over.id);
            const newItems = arrayMove(items, oldIndex, newIndex);
            
            // Persist new order
            const updates = newItems.map((item, index) => ({
                id: item.id,
                order: index + 1 // 1-based index
            }));

            // Optimistic update done, now DB update
            // We can't do a bulk update with upsert easily if we don't include all fields or if we want to be safe.
            // But we can iterate. For small lists, it's fine. 
            // Better: use an RPC or upsert. Supabase upsert requires all primary keys.
            // Checkpoints has ID.
            
            // Let's do a loop for simplicity or upsert if we map all necessary fields.
            // We only need ID and order. But upsert typically replaces.
            // Update is better.
            
            Promise.all(updates.map(u => 
                supabase.from('checkpoints').update({ order: u.order }).eq('id', u.id)
            )).catch(err => {
                console.error("Failed to reorder", err)
                toast.error("Failed to save order")
                fetchCheckpoints() // Revert on error
            });

            return newItems;
        });
    }
  }

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
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={checkpoints.map(c => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
            {checkpoints.map((checkpoint) => (
                <SortableCheckpointItem 
                    key={checkpoint.id} 
                    checkpoint={checkpoint} 
                    userRole={userRole}
                    onSelect={() => {}} // Not really needed for this design anymore since Sheet is inside
                />
            ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
// Need to add toast import
import { toast } from "sonner"
