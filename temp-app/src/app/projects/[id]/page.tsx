"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CheckpointList } from "@/components/checkpoint-list"
import { AddCheckpointDialog } from "@/components/add-checkpoint-dialog"
import { ManageMembersDialog } from "@/components/manage-members-dialog"
import { FloatingNav } from "@/components/floating-nav"
import { ProjectMembersList } from "@/components/project-members-list"
import { LeaveProjectDialog } from "@/components/leave-project-dialog"
import { Project } from "@/types"
import { useProjectRole } from "@/hooks/use-project-role"

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

        // Fetch members with profiles
        const { data: membersData, error: membersError } = await supabase
          .from("project_members")
          .select(`
            user_id,
            role,
            status,
            member_color,
            profile:user_id (
              username,
              display_name,
              avatar_url
            )
          `)
          .eq("project_id", id)

        if (membersError) {
          console.error("Error fetching members:", membersError)
        } else {
          setMembers(membersData || [])
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
  }, [id, router, refreshKey]) // Refresh when checkpoint added (or via refreshKey)

  const handleCheckpointAdded = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Check if current user is the owner
  const isOwner = project && currentUserId === project.owner_id

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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <FloatingNav />

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
                  {/* @ts-expect-error project_icon might be missing in type definition yet */}
                  {project.project_icon || '📁'}
                </span>
              </h1>
              {/* @ts-expect-error category might be missing in type definition yet */}
              {project.category && (
                <span className="text-xs text-muted-foreground hidden md:inline-block">
                  {project.category}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isOwner && (
              <LeaveProjectDialog projectId={project.id} projectTitle={project.title} />
            )}
            <ManageMembersDialog projectId={project.id} />
            <AddCheckpointDialog projectId={project.id} onSuccess={handleCheckpointAdded} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* Checkpoints Column */}
            <div className="lg:col-span-3 space-y-6">
              <CheckpointList projectId={project.id} userRole={userRole} key={refreshKey} />
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-1 space-y-6">
              <ProjectMembersList members={members} currentUserId={currentUserId} />

              {/* Additional project details could go here */}
              {/* @ts-expect-error description might be missing in type definition yet */}
              {project.description && (
                <div className="p-4 bg-white dark:bg-card rounded-lg border shadow-sm">
                  <h3 className="font-semibold mb-2">About Project</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {/* @ts-expect-error description might be missing in type definition yet */}
                    {project.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function ProjectDetailPage() {
  return <ProjectDetailContent />
}
