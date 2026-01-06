"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Project, Role } from "@/types"
import { CalendarDays, Users } from "lucide-react"

interface ProjectListProps {
  userId: string
}

interface ProjectWithRole extends Project {
    user_role: Role
    progress: number
    total_tasks: number
    completed_tasks: number
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
              title,
              status,
              start_date,
              max_users,
              checkpoints (
                is_completed
              )
            )
          `)
          .eq("user_id", userId)

        if (error) {
            console.error("Error fetching projects:", error)
            return
        }
        
        // Transform data
        const mappedProjects = data?.map((item: any) => {
            const checkpoints = item.projects.checkpoints || []
            const total = checkpoints.length
            const completed = checkpoints.filter((c: any) => c.is_completed).length
            const progress = total > 0 ? (completed / total) * 100 : 0
            
            return {
                ...item.projects,
                user_role: item.role,
                progress,
                total_tasks: total,
                completed_tasks: completed
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
        <Card 
            key={project.id} 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => window.location.href = `/projects/${project.id}`}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{project.title}</CardTitle>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                    {project.status}
                </Badge>
            </div>
            <CardDescription className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {project.user_role}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                <span>Starts: {new Date(project.start_date || "").toLocaleDateString()}</span>
            </div>
            
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{project.completed_tasks}/{project.total_tasks} tasks</span>
                </div>
                <Progress value={project.progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
