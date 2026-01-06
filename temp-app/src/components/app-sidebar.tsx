"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FolderKanban, Settings, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface UserProfile {
    email: string | undefined
    username: string | null
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const getProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            // Fetch username from profiles table
            const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
            setProfile({
                email: user.email,
                username: data?.username || user.email?.split('@')[0] || "User"
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
    { href: "/dashboard", label: "Projects", icon: FolderKanban }, // For now pointing to same place
    { href: "#", label: "Settings", icon: Settings },
  ]

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      {/* Brand / Logo */}
      <div className="flex h-24 items-center justify-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold w-full justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
             <img src="/logo-tpv.png" alt="TPV App" className="h-20 w-auto object-contain" />
        </Link>
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
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary">
                        {profile?.username?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="text-sm font-medium">{profile?.username}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={profile?.email}>
                        {profile?.email}
                    </span>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
        </div>
      </div>
    </div>
  )
}
