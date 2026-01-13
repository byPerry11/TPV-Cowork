"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, ArrowLeft, Pencil, Check, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CheckpointList } from "@/components/checkpoint-list"
import { AddCheckpointDialog } from "@/components/add-checkpoint-dialog"
import { ProjectMembersList } from "@/components/project-members-list"
import { LeaveProjectDialog } from "@/components/leave-project-dialog"
import { ProjectSettingsDialog } from "@/components/project-settings-dialog"
import { Project, Checkpoint } from "@/types"
import { useProjectRole } from "@/hooks/use-project-role"
import { ProjectCalendar } from "@/components/project-calendar"
import { ProjectCompletionDialog } from "@/components/project-completion-dialog"

// DnD Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function ProjectDetailContent() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [members, setMembers] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const { role: userRole } = useProjectRole(id)

  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [tempDescription, setTempDescription] = useState("")
  const [savingDescription, setSavingDescription] = useState(false)

  // Checkpoints State (Lifted Up)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(true)

  // Drag State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeDragMember, setActiveDragMember] = useState<any>(null)


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    const fetchProjectAndMembers = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push("/login")
          return
        }
        setCurrentUserId(session.user.id)

        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", id)
          .single()

        if (projectError) {
          console.error("Error fetching project:", projectError)
          if (!projectData) router.push("/dashboard")
          return
        }

        setProject(projectData)
        setTempDescription(projectData.description || "")

        // Fetch members (raw, no join)
        const { data: membersRaw, error: membersError } = await supabase
          .from("project_members")
          .select("user_id, role, status, member_color")
          .eq("project_id", id)

        if (membersError) {
          console.error("Error fetching members:", membersError)
        } else {
          // Manually fetch profiles
          const userIds = membersRaw?.map(m => m.user_id) || []
          let profiles: any[] = []

          if (userIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url')
              .in('id', userIds)
            profiles = profilesData || []
          }

          // Merge data
          const mergedMembers = membersRaw?.map(member => {
            const profile = profiles.find(p => p.id === member.user_id)
            return {
              ...member,
              profile: profile ? {
                username: profile.username,
                display_name: profile.display_name,
                avatar_url: profile.avatar_url
              } : null
            }
          }) || []

          setMembers(mergedMembers)
        }

      } catch (err) {
        console.error("Unexpected error:", err)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchProjectAndMembers()
    }
  }, [id, router, refreshKey])

  // Separate effect/func for checkpoints to keep it clean
  useEffect(() => {
    if (id) {
      fetchCheckpoints()
    }
  }, [id, refreshKey])

  const fetchCheckpoints = async () => {
    setLoadingCheckpoints(true)
    try {
      const { data, error } = await supabase
        .from("checkpoints")
        .select("*")
        .eq("project_id", id)
        .order("order", { ascending: true });

      if (error) throw error
      setCheckpoints(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCheckpoints(false);
    }
  };


  const handleCheckpointAdded = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleSaveDescription = async () => {
    if (!project) return
    setSavingDescription(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({ description: tempDescription })
        .eq('id', project.id)

      if (error) throw error

      setProject({ ...project, description: tempDescription })
      setIsEditingDescription(false)
      toast.success("Description updated")
    } catch (error) {
      console.error("Error updating description:", error)
      toast.error("Failed to update description")
    } finally {
      setSavingDescription(false)
    }
  }

  // Drag Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    if (active.data.current?.type === 'member') {
      setActiveDragMember(active.data.current)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragMember(null)

    if (!over) return

    // Case 1: Reordering Checkpoints
    if (active.data.current?.type === 'checkpoint' && over.data.current?.type === 'checkpoint' && active.id !== over.id) {
      setCheckpoints((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Persist new order
        const updates = newItems.map((item, index) => ({
          id: item.id,
          order: index + 1,
        }));

        // Sync with DB
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
          fetchCheckpoints(); // Revert
        });

        return newItems;
      });
    }

    // Case 2: Assigning Member to Checkpoint
    if (active.data.current?.type === 'member' && over.data.current?.type === 'checkpoint') {
      const memberId = active.data.current.memberId
      const checkpointId = over.data.current.checkpointId

      // Optimistic Update
      setCheckpoints(prev => prev.map(c =>
        c.id === checkpointId ? { ...c, assigned_to: memberId } : c
      ))

      try {
        const { error } = await supabase
          .from('checkpoints')
          .update({ assigned_to: memberId })
          .eq('id', checkpointId)

        if (error) throw error
        toast.success("Member assigned to checkpoint!")
      } catch (error) {
        console.error("Error assigning member", error)
        toast.error("Failed to assign member")
        fetchCheckpoints() // Revert
      }
    }
  };

  const isOwner = project && currentUserId === project.owner_id
  const projectStatus = {
    completed: checkpoints.filter(c => c.is_completed).length,
    total: checkpoints.length
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-bold">Project Not Found</h1>
        <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
      </div>
    )
  }

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b bg-white px-4 md:px-6 py-4 dark:bg-gray-950 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard")}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
                  <span className="md:hidden">{project.title.slice(0, 7)}{project.title.length > 7 ? '...' : ''}</span>
                  <span className="hidden md:inline truncate">{project.title}</span>
                  <span className="text-2xl" role="img" aria-label="icon">
                    {project.project_icon || '📁'}
                  </span>
                </h1>
                {project.category && (
                  <span className="text-xs text-muted-foreground hidden md:inline-block">
                    {project.category}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isOwner ? (
                <ProjectSettingsDialog project={project} members={members} isOwner={isOwner} onProjectUpdate={() => setRefreshKey(prev => prev + 1)} />
              ) : (
                <LeaveProjectDialog projectId={project.id} projectTitle={project.title} />
              )}
              <AddCheckpointDialog projectId={project.id} onSuccess={handleCheckpointAdded} />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            {/* Project Description at Top */}
            <div className="mb-6 p-4 bg-white dark:bg-card rounded-lg border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-primary">About Project</h3>
                {isOwner && !isEditingDescription && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                    onClick={() => setIsEditingDescription(true)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {isEditingDescription ? (
                <div className="space-y-3">
                  <Textarea
                    value={tempDescription}
                    onChange={(e) => setTempDescription(e.target.value)}
                    placeholder="Describe your project..."
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsEditingDescription(false)
                        setTempDescription(project.description || "")
                      }}
                      disabled={savingDescription}
                    >
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveDescription}
                      disabled={savingDescription}
                    >
                      {savingDescription ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {project.description || "No description provided."}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
              {/* Checkpoints Column */}
              <div className="lg:col-span-3 space-y-6">
                {isOwner && projectStatus.completed === projectStatus.total && projectStatus.total > 0 && !project.end_date && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 p-4 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2">
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-300">All Tasks Completed!</h4>
                      <p className="text-sm text-green-600 dark:text-green-400">The project is ready to be finalized.</p>
                    </div>
                    <ProjectCompletionDialog
                      projectId={project.id}
                      projectTitle={project.title}
                      onCompleted={() => {
                        setProject(prev => prev ? { ...prev, end_date: new Date().toISOString() } : null)
                        setRefreshKey(p => p + 1)
                      }}
                    />
                  </div>
                )}

                {loadingCheckpoints ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : (
                  <CheckpointList
                    checkpoints={checkpoints}
                    projectId={project.id}
                    userRole={userRole}
                    members={members}
                  />
                )}
              </div>

              {/* Sidebar Column */}
              <div className="lg:col-span-1 space-y-6">
                {/* Pass userRole so we know if they can drag */}
                <ProjectMembersList
                  members={members}
                  currentUserId={currentUserId}
                  projectId={project.id}
                  userRole={userRole}
                />

                {project && (
                  <ProjectCalendar
                    projectId={project.id}
                    startDate={new Date(project.start_date)}
                    endDate={project.end_date ? new Date(project.end_date) : undefined}
                    members={members}
                  />
                )}
              </div>
            </div>
          </main>
        </div >
      </div >
      <DragOverlay dropAnimation={dropAnimation}>
        {activeDragMember ? (
          <div className="bg-background border rounded-md p-2 shadow-lg flex items-center gap-2 w-[200px]">
            <Avatar className="h-6 w-6">
              <AvatarImage src={activeDragMember.memberProfile?.avatar_url} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">{activeDragMember.memberProfile?.display_name || "User"}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default function ProjectDetailPage() {
  return <ProjectDetailContent />
}
