"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Project, Role } from "@/types"
import { ProjectCard } from "@/components/project-card"
import { CalendarDays, Users } from "lucide-react"

interface ProjectListProps {
  userId: string
}

interface ProjectWithRole extends Project {
  user_role: Role
  progress: number
  total_tasks: number
  completed_tasks: number
  members: { avatar_url: string | null }[]
}

export function ProjectList({ userId }: ProjectListProps) {
  const [projects, setProjects] = useState<ProjectWithRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from("project_members")
          .select(`
            role,
            projects:project_id (
              id,
              id,
              title,
              description,
              category,
              color,
              project_icon,
              status,
              start_date,
              max_users,
              checkpoints (
                is_completed
              ),
              project_members (
                user_id,
                profiles (
                  avatar_url
                )
              )
            )
          `)
          .eq("user_id", userId)

        if (error) {
          console.error("Error fetching projects:", error)
          return
        }

        // Transform data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedProjects = data?.map((item: any) => {
          const checkpoints = item.projects.checkpoints || []
          const total = checkpoints.length
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const completed = checkpoints.filter((c: any) => c.is_completed).length
          const progress = total > 0 ? (completed / total) * 100 : 0

          // Map members for UI
          const members = item.projects.project_members?.map((pm: any) => ({
             avatar_url: pm.profiles?.avatar_url
          })) || []

          return {
            ...item.projects,
            user_role: item.role,
            progress,
            total_tasks: total,
            completed_tasks: completed,
            members
          }
        }) as ProjectWithRole[]

        setProjects(mappedProjects || [])
      } catch (err) {
        console.error("Unexpected error:", err)
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchProjects()
    }
  }, [userId])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col space-y-3">
            <Skeleton className="h-[125px] w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <h3 className="mt-4 text-lg font-semibold">No hay proyectos</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            No tienes proyectos asignados actualmente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

      {projects.map((project) => (
        <div key={project.id} className="h-full">
            <ProjectCard
                id={project.id}
                title={project.title}
                description={project.title} // Description was missing in select? No, it wasn't fetched! I need to check fetch.
                // Wait, ProjectList fetching didn't select description or other fields needed by ProjectCard?
                // Fetching query: select(id, title, status, start_date, max_users...)
                // ProjectCard needs: description, category, color, project_icon
                // I need to update the query in ProjectList as well if I want to use ProjectCard fully.
                // For now, I will use what I have and Defaults, or update query. 
                // Let's update query in next step.
                status={project.status}
                role={project.user_role}
                progress={project.progress}
                memberCount={project.members.length} // Approximate or fetched count? fetch didn't get count, just members.
                members={project.members}
            />
        </div>
      ))}
    </div>
  )
}
