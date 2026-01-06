"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Loader2 } from "lucide-react"

import { CreateProjectDialog } from "@/components/create-project-dialog"
import { ProjectList } from "@/components/project-list"
import { AppSidebar } from "@/components/app-sidebar"
import { StatsCards } from "@/components/stats-cards"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  
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
          // Flattened query to get all projects user is involved in + their checkpoints
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

          const projects = data?.map((d: any) => d.projects) || []

          const total = projects.length
          const active = projects.filter((p: any) => p.status === 'active').length
          
          let totalTasks = 0
          let completedTasks = 0
          let sumProgress = 0

          projects.forEach((p: any) => {
              const checks = p.checkpoints || []
              const pTotal = checks.length
              const pCompleted = checks.filter((c: any) => c.is_completed).length
              
              totalTasks += pTotal
              // Pending = Total - Completed (globally)
              
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
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Overview of your projects and performance.
                    </p>
                </div>
                <CreateProjectDialog onSuccess={handleProjectCreated} />
            </div>

            {/* Stats Cards */}
            <StatsCards 
                totalProjects={stats.totalProjects}
                activeProjects={stats.activeProjects}
                pendingTasks={stats.pendingTasks}
                avgProgress={stats.avgProgress}
            />

            {/* Project List */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Your Projects</h2>
                {userId && <ProjectList userId={userId} key={refreshKey} />}
            </div>
        </div>
      </main>
    </div>
  )
}
