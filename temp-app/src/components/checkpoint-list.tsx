import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Checkpoint } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Camera, GripVertical, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { EvidenceForm } from "@/components/evidence-form";
import { EvidenceViewer } from "@/components/evidence-viewer";
import { CheckpointTasksList } from "@/components/checkpoint-tasks-list";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CheckpointListProps {
  projectId: string;
  userRole: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  members: any[];
}

interface SortableCheckpointItemProps {
  checkpoint: Checkpoint;
  onSelect: (checkpoint: Checkpoint) => void;
  userRole: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  members: any[];
}

function SortableCheckpointItem({
  checkpoint,
  onSelect,
  userRole,
  members,
}: SortableCheckpointItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: checkpoint.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Find completer color if completed
  let cardStyle = {};
  let iconColor = "text-green-500";

  if (checkpoint.is_completed && checkpoint.completed_by) {
    const completer = members.find(
      (m) => m.user_id === checkpoint.completed_by,
    );
    if (completer && completer.member_color) {
      const color =
        completer.role === "admin" ? "#a855f7" : completer.member_color;
      cardStyle = {
        borderColor: color,
        backgroundColor: `${color}10`, // 10% opacity hex
      };
      iconColor = ""; // We'll apply inline style to icon or keep green? User said "pintar del color de ese usuario"
      // Let's color the icon too? Or just the card. User said "se dene de pintar del color".
      // I'll color the border and bg.
    }
  }

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Card
        className={`${checkpoint.is_completed ? "border-2" : ""} transition-all duration-200`}
        style={cardStyle}
      >
        <CardHeader className="flex flex-row items-center space-x-4 p-4 pb-2">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:text-primary touch-none"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          <div 
            className="flex-1 flex items-center justify-between cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-medium">
                {checkpoint.title}
              </CardTitle>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>

            {checkpoint.is_completed ? (
              <CheckCircle2
                className={`h-5 w-5 ${!checkpoint.completed_by ? "text-green-500" : ""}`}
                style={{
                  color: cardStyle["borderColor" as keyof typeof cardStyle],
                }}
              />
            ) : (
              <Circle className="h-5 w-5 text-gray-300" />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 pl-14">
            {/* Sub-tasks area - Visible when expanded */}
            {isExpanded && (
                <div className="mb-4 border-t pt-2 mt-1 animate-in slide-in-from-top-2 fade-in duration-200">
                    <CheckpointTasksList 
                        checkpointId={checkpoint.id} 
                        canEdit={true} // Allow all members to add tasks as per request
                    />
                </div>
            )}

          <div className="flex justify-end pt-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant={checkpoint.is_completed ? "outline" : "default"}
                  size="sm"
                  onClick={() => onSelect(checkpoint)}
                  style={
                    checkpoint.is_completed
                      ? {
                          borderColor:
                            cardStyle["borderColor" as keyof typeof cardStyle],
                          color:
                            cardStyle["borderColor" as keyof typeof cardStyle],
                        }
                      : {}
                  }
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {checkpoint.is_completed ? "View Evidence" : "Add Evidence"}
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {checkpoint.is_completed
                      ? `Evidence: ${checkpoint.title}`
                      : `Submit Evidence: ${checkpoint.title}`}
                  </DialogTitle>
                </DialogHeader>
                {checkpoint.is_completed ? (
                  <EvidenceViewer
                    checkpointId={checkpoint.id}
                    userRole={userRole}
                  />
                ) : (
                  <EvidenceForm
                    checkpointId={checkpoint.id}
                    onSuccess={() => {
                      window.location.reload();
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CheckpointList({
  projectId,
  userRole,
  members,
}: CheckpointListProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Fetch checkpoints
  const fetchCheckpoints = async () => {
    try {
      const { data, error } = await supabase
        .from("checkpoints")
        .select("*")
        .eq("project_id", projectId)
        .order("order", { ascending: true });

      if (error) {
        console.error("Error fetching checkpoints:", error);
        return;
      }
      setCheckpoints(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckpoints();
  }, [projectId]);

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
          order: index + 1, // 1-based index
        }));

        // Optimistic update done, now DB update
        // We can't do a bulk update with upsert easily if we don't include all fields or if we want to be safe.
        // But we can iterate. For small lists, it's fine.
        // Better: use an RPC or upsert. Supabase upsert requires all primary keys.
        // Checkpoints has ID.

        // Let's do a loop for simplicity or upsert if we map all necessary fields.
        // We only need ID and order. But upsert typically replaces.
        // Update is better.

        Promise.all(
          updates.map((u) =>
            supabase
              .from("checkpoints")
              .update({ order: u.order })
              .eq("id", u.id),
          ),
        ).catch((err) => {
          console.error("Failed to reorder", err);
          toast.error("Failed to save order");
          fetchCheckpoints(); // Revert on error
        });

        return newItems;
      });
    }
  };

  if (loading) {
    return <div>Loading tasks...</div>;
  }

  if (checkpoints.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No checkpoints defined for this project.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={checkpoints.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {checkpoints.map((checkpoint) => (
            <SortableCheckpointItem
              key={checkpoint.id}
              checkpoint={checkpoint}
              userRole={userRole}
              members={members}
              onSelect={() => {}} // Not really needed for this design anymore since Sheet is inside
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
