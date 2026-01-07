"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

import { CreateProjectDialog } from "@/components/create-project-dialog"
import { ProjectList } from "@/components/project-list"
import { AppSidebar } from "@/components/app-sidebar"
import { StatsCards } from "@/components/stats-cards"
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context"
import { UserSearch } from "@/components/user-search"

function DashboardContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const { toggle } = useSidebar()

  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    pendingTasks: 0,
    avgProgress: 0
  })

  // 1. Check Auth & Get User
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
        return
      }
      setUserId(session.user.id)
      fetchStats(session.user.id)
      setLoading(false)
    }
    checkUser()
  }, [router])

  // 2. Fetch Stats
  const fetchStats = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("project_members")
        .select(`
                projects:project_id (
                    id,
                    status,
                    checkpoints (
                        is_completed
                    )
                )
            `)
        .eq("user_id", uid)

      if (error) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projects = data?.map((d: any) => d.projects) || []

      const total = projects.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const active = projects.filter((p: any) => p.status === 'active').length

      let totalTasks = 0
      let completedTasks = 0
      let sumProgress = 0

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projects.forEach((p: any) => {
        const checks = p.checkpoints || []
        const pTotal = checks.length
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pCompleted = checks.filter((c: any) => c.is_completed).length

        totalTasks += pTotal

        if (pTotal > 0) {
          sumProgress += (pCompleted / pTotal) * 100
        }
        completedTasks += pCompleted
      })

      const avgProgress = total > 0 ? sumProgress / total : 0
      const pending = totalTasks - completedTasks

      setStats({
        totalProjects: total,
        activeProjects: active,
        pendingTasks: pending,
        avgProgress
      })

    } catch (err) {
      console.error("Error fetching stats:", err)
    }
  }

  // Refresh mechanism
  const [refreshKey, setRefreshKey] = useState(0)
  const handleProjectCreated = () => {
    setRefreshKey(prev => prev + 1)
    if (userId) fetchStats(userId)
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
      <AppSidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex flex-col gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggle}
                            className="md:hidden"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    </div>
                    <p className="text-sm text-muted-foreground hidden md:block">
                        Overview of your projects and performance.
                    </p>
                </div>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                    <UserSearch />
                    <CreateProjectDialog onSuccess={handleProjectCreated} />
                </div>
            </div>

          <ProjectList key={refreshKey} userId={userId!} />
          
          <StatsCards {...stats} />
        </div>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <SidebarProvider>
      <DashboardContent />
    </SidebarProvider>
  )
}
