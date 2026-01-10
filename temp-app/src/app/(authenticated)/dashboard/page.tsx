"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2 } from "lucide-react"

import { ProjectCard } from "@/components/project-card"
import { CalendarWidget } from "@/components/calendar-widget"
import { GlobalSearchBar } from "@/components/global-search-bar"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NotificationsList } from "@/components/notifications-list"

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
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState("")
  const [projects, setProjects] = useState<UserProject[]>([])

  const [sessionUserId, setSessionUserId] = useState<string>("")
  const [hasNotifications, setHasNotifications] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
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

      const checkNotifications = async () => {
        // Check pending friend requests
        const { count: friendRequests } = await supabase
          .from('friend_requests')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', session.user.id)
          .eq('status', 'pending')

        // Check pending project invites
        const { count: projectInvites } = await supabase
          .from('project_members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .eq('status', 'pending')

        if ((friendRequests || 0) > 0 || (projectInvites || 0) > 0) {
          setHasNotifications(true)
        }
      }
      checkNotifications()

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
                    status,
                    owner_id
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
                owner_id: project.owner_id
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

              {/* Responsive Notification Bell */}
              {isDesktop ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="icon" variant="ghost" className="rounded-full relative">
                      <Bell className="h-5 w-5" />
                      {hasNotifications && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-600 border-2 border-background" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-4 border-b">
                      <h4 className="font-semibold">Notifications</h4>
                    </div>
                    <NotificationsList embedded={true} />
                    <div className="p-2 border-t bg-muted/30">
                      <Button variant="ghost" className="w-full text-xs h-8" onClick={() => router.push('/dashboard/notifications')}>
                        View All
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full relative"
                  onClick={() => router.push('/dashboard/notifications')}
                >
                  <Bell className="h-5 w-5" />
                  {hasNotifications && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600 border border-white" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Projects Grid + Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Projects Grid - Takes 2 columns on large screens */}
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
