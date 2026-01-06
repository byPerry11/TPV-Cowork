"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CheckpointList } from "@/components/checkpoint-list"
import { AddCheckpointDialog } from "@/components/add-checkpoint-dialog"
import { ManageMembersDialog } from "@/components/manage-members-dialog"
import { Project } from "@/types"

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

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
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 border-b bg-white px-6 py-4 dark:bg-gray-950 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">{project.title}</h1>
        </div>
        <div className="flex items-center gap-2">
            <ManageMembersDialog projectId={project.id} />
            <AddCheckpointDialog projectId={project.id} onSuccess={handleCheckpointAdded} />
        </div>
      </header>

      <main className="flex-1 p-6">
        <CheckpointList projectId={project.id} key={refreshKey} />
      </main>
    </div>
  )
}
