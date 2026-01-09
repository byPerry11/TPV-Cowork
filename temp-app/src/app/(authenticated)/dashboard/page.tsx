"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2 } from "lucide-react"

import { ProjectCard } from "@/components/project-card"
import { CalendarWidget } from "@/components/calendar-widget"
import { GlobalSearchBar } from "@/components/global-search-bar"
import { UserAvatarMenu } from "@/components/user-avatar-menu"

interface UserProject {
  id: string
  title: string
  description?: string | null
  category?: string | null
  color?: string | null
  project_icon?: string | null
  status: "active" | "completed" | "archived"
  role: "admin" | "manager" | "member"
  progress: number
  memberCount: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState("")
  const [projects, setProjects] = useState<UserProject[]>([])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
        return
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", session.user.id)
        .single()

      setDisplayName(profile?.display_name || profile?.username || "User")

      const fetchProjects = async (userId: string) => {
        const { data: projectMembers } = await supabase
          .from("project_members")
          .select(`
                role,
                status,
                project:project_id (
                    id,
                    title,
                    category,
                    description,
                    color,
                    project_icon,
                    status
                )
            `)
          .eq("user_id", userId)
          .eq("status", "active")

        if (!projectMembers) return []

        // For each project, get checkpoints and calculate progress
        const projectsWithProgress = await Promise.all(
          projectMembers
            .filter(pm => pm.project && typeof pm.project === 'object')
            .map(async (member) => {
              const project = member.project as any
              const { data: checkpoints } = await supabase
                .from("checkpoints")
                .select("is_completed")
                .eq("project_id", project.id)

              const total = checkpoints?.length || 0
              const completed = checkpoints?.filter(c => c.is_completed).length || 0
              const progress = total > 0 ? (completed / total) * 100 : 0

              // Count members
              const { count } = await supabase
                .from("project_members")
                .select("*", { count: "exact", head: true })
                .eq("project_id", project.id)
                .eq("status", "active")

              return {
                ...project,
                role: member.role,
                progress,
                memberCount: count || 0,
                category: project.category,
                description: project.description,
                color: project.color,
                project_icon: project.project_icon,
              }
            })
        )

        setProjects(projectsWithProgress)
      }
      await fetchProjects(session.user.id)

      setLoading(false)
    }
    checkUser()
  }, [router])

  const calculateProgress = (checkpoints: Array<{ is_completed: boolean }>) => {
    if (checkpoints.length === 0) return 0
    const completed = checkpoints.filter(c => c.is_completed).length
    return (completed / checkpoints.length) * 100
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 md:p-6 space-y-6 pb-24 md:pb-6">
          {/* Header with Search and Avatar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight">
                Hello, {displayName} 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                Welcome back! Here's what's happening with your projects.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex-1 md:flex-initial">
                <GlobalSearchBar />
              </div>
              <UserAvatarMenu />
            </div>
          </div>

          {/* Projects Grid + Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Projects Grid - Takes 2 columns on large screens */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Your Projects</h2>
                <span className="text-sm text-muted-foreground">
                  {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                </span>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">No projects yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first project to get started
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map(project => (
                    <ProjectCard
                      key={project.id}
                      id={project.id}
                      title={project.title}
                      description={project.description}
                      category={project.category}
                      color={project.color}
                      project_icon={project.project_icon}
                      progress={project.progress}
                      role={project.role}
                      status={project.status}
                      memberCount={project.memberCount}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Calendar - Takes 1 column on large screens */}
            <div className="lg:col-span-1">
              <CalendarWidget />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
