"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, User, Bell, FolderKanban, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export function FloatingNav() {
  const pathname = usePathname()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchAvatar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single()
        if (data) setAvatarUrl(data.avatar_url)
      }
    }
    fetchAvatar()
  }, [])

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/dashboard/projects", icon: FolderKanban, label: "Projects" },
    { href: "/chats", icon: MessageCircle, label: "Chats" },
    { href: "/profile", icon: User, label: "Profile", isProfile: true },
  ]

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 md:left-4 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 z-50">
      <div className="flex md:flex-col items-center gap-2 p-3 rounded-2xl bg-background/80 backdrop-blur-lg border border-border shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            (item.href === "/dashboard" && pathname === "/dashboard") ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center justify-center w-12 h-12 rounded-xl transition-colors duration-200",
                "hover:bg-primary/10",
                isActive ? "text-primary-foreground" : "text-muted-foreground"
              )}
              title={item.label}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-pill"
                  className="absolute inset-0 bg-primary rounded-xl shadow-md"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {/* Profile Avatar or Icon */}
              {/* @ts-ignore */}
              {item.isProfile && avatarUrl ? (
                <div className="relative z-10 w-6 h-6 rounded-full overflow-hidden ring-1 ring-white/20">
                  <img src={avatarUrl} alt="Me" className="w-full h-full object-cover" />
                </div>
              ) : (
                <Icon className="h-5 w-5 relative z-10" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
