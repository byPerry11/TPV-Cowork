"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2 } from "lucide-react"

import { ProjectCard } from "@/components/project-card"
import { CalendarWidget } from "@/components/calendar-widget"
import { GlobalSearchBar } from "@/components/global-search-bar"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/hooks/useNotifications"

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
  owner_id: string
  membershipStatus?: "active" | "pending" | "rejected"
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState("")
  const [projects, setProjects] = useState<UserProject[]>([])

  const [sessionUserId, setSessionUserId] = useState<string>("")
  const { handleProjectInvitation } = useNotifications()

  const fetchProjects = useCallback(async (userId: string) => {
    // Note: We don't set loading(true) here to avoid flickering on refresh
    const { data: projectMembers } = await supabase
      .from("project_members")
      .select(`
            project_id,
            role,
            status,
            project:project_id (
                id,
                title,
                category,
                description,
                color,
                project_icon,
                status,
                owner_id
            )
        `)
      .eq("user_id", userId)
      .in("status", ["active", "pending"])

    if (!projectMembers) {
      setProjects([])
      return
    }

    // For each project, get checkpoints and calculate progress
    const projectsWithProgress = await Promise.all(
      projectMembers
        .map(async (member) => {
          const project = member.project as any || {}

          let progress = 0
          let memberCount = 0

          if (project.id) {
            const { data: checkpoints } = await supabase
              .from("checkpoints")
              .select("is_completed")
              .eq("project_id", project.id)

            const total = checkpoints?.length || 0
            const completed = checkpoints?.filter(c => c.is_completed).length || 0
            progress = total > 0 ? (completed / total) * 100 : 0

            // Count members
            const { count } = await supabase
              .from("project_members")
              .select("*", { count: "exact", head: true })
              .eq("project_id", project.id)
              .eq("status", "active")
            memberCount = count || 0
          }

          return {
            id: project.id || member.project_id,
            title: project.title || "Private Project",
            description: project.description,
            category: project.category,
            color: project.color,
            project_icon: project.project_icon || "🔒",
            status: project.status || "active",
            owner_id: project.owner_id || "unknown",
            role: member.role,
            progress,
            memberCount,
            membershipStatus: member.status
          } as UserProject
        })
    )

    setProjects(projectsWithProgress)
  }, [])



  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
        return
      }
      setSessionUserId(session.user.id)

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", session.user.id)
        .single()

      setDisplayName(profile?.display_name || profile?.username || "User")

      await fetchProjects(session.user.id)
      setLoading(false)
    }
    checkUser()
  }, [router, fetchProjects])

  const calculateProgress = (checkpoints: Array<{ is_completed: boolean }>) => {
    if (checkpoints.length === 0) return 0
    const completed = checkpoints.filter(c => c.is_completed).length
    return (completed / checkpoints.length) * 100
  }

  const handleInvitationResponse = async (projectId: string, accept: boolean) => {
    await handleProjectInvitation(projectId, accept)
    if (sessionUserId) {
      fetchProjects(sessionUserId)
    }
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

              {/* Responsive Notification Bell - Removed as per request */}
            </div>
          </div>

          {/* Projects Grid + Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Projects Grid - Takes 2 columns on large screens */}
            <div className="lg:col-span-2 space-y-8">

              {/* Owned Projects Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">My Projects</h2>
                  <span className="text-sm text-muted-foreground">
                    {projects.filter(p => p.owner_id === sessionUserId).length}
                  </span>
                </div>

                {projects.filter(p => p.owner_id === sessionUserId).length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
                    <p className="text-muted-foreground">You haven't created any projects yet</p>
                    {/* Optional: Add Create Project Button here if desired */}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects
                      .filter(p => p.owner_id === sessionUserId)
                      .map(project => (
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

              {/* Shared Projects Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Shared Projects</h2>
                  <span className="text-sm text-muted-foreground">
                    {projects.filter(p => p.owner_id !== sessionUserId).length}
                  </span>
                </div>

                {projects.filter(p => p.owner_id !== sessionUserId).length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
                    <p className="text-muted-foreground">No shared projects yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects
                      .filter(p => p.owner_id !== sessionUserId)
                      .map(project => (
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
                          membershipStatus={project.membershipStatus}
                          onRespond={(accept) => handleInvitationResponse(project.id, accept)}
                        />
                      ))}
                  </div>
                )}
              </div>

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
