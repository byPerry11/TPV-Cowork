"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FolderKanban, Settings, LogOut, User, X, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/contexts/sidebar-context"
import { NotificationsPopover } from "@/components/notifications-popover"

interface UserProfile {
  email: string | undefined
  username: string | null
  displayName: string | null
  avatar_url: string | null
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const { isOpen, close } = useSidebar()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('username, display_name, avatar_url').eq('id', user.id).single()
        setProfile({
          email: user.email,
          username: data?.username || user.email?.split('@')[0] || "User",
          displayName: data?.display_name || null,
          avatar_url: data?.avatar_url || null
        })
      }
    }
    getProfile()
  }, [])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error("Error signing out")
    } else {
      router.push("/login")
    }
  }

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard", label: "Projects", icon: FolderKanban },
    { href: "/profile", label: "Profile", icon: User },
    { href: "#", label: "Settings", icon: Settings },
  ]

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed md:relative h-screen w-64 flex-col border-r bg-background z-50 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        !isOpen && "md:w-0 md:border-0"
      )}>
        <div className={cn(
          "flex h-full w-64 flex-col",
          !isOpen && "md:hidden"
        )}>
          {/* Close button for mobile */}
          <div className="flex h-24 items-center justify-between border-b px-4 md:justify-center">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/main-logo.png" alt="COWork" className="h-16 w-auto object-contain" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={close}
              className="md:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-auto py-4">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4 space-y-1">
              {links.map((link, index) => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link
                    key={index}
                    href={link.href}
                    onClick={() => {
                      if (window.innerWidth < 768) close()
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                      isActive ? "bg-muted text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User Footer */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile?.username?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{profile?.displayName || profile?.username}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                    @{profile?.username}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <NotificationsPopover />
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
