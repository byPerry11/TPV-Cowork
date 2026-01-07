"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, ArrowLeft, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CheckpointList } from "@/components/checkpoint-list"
import { AddCheckpointDialog } from "@/components/add-checkpoint-dialog"
import { ManageMembersDialog } from "@/components/manage-members-dialog"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context"
import { Project } from "@/types"
import { useProjectRole } from "@/hooks/use-project-role"

function ProjectDetailContent() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { toggle } = useSidebar()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const { role: userRole } = useProjectRole(id)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", id)
          .single()

        if (error) {
          console.error("Error fetching project:", error)
          if (!data) router.push("/dashboard")
          return
        }

        setProject(data)
      } catch (err) {
        console.error("Unexpected error:", err)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchProject()
    }
  }, [id, router])

  const handleCheckpointAdded = () => {
    setRefreshKey(prev => prev + 1)
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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <AppSidebar />

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-white px-4 md:px-6 py-4 dark:bg-gray-950 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="md:hidden shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard")}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg md:text-xl font-bold truncate">{project.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ManageMembersDialog projectId={project.id} />
            <AddCheckpointDialog projectId={project.id} onSuccess={handleCheckpointAdded} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <CheckpointList projectId={project.id} userRole={userRole} key={refreshKey} />
        </main>
      </div>
    </div>
  )
}

export default function ProjectDetailPage() {
  return (
    <SidebarProvider>
      <ProjectDetailContent />
    </SidebarProvider>
  )
}
