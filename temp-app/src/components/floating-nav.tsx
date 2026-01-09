"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, User, Bell, FolderKanban } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export function FloatingNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/dashboard/projects", icon: FolderKanban, label: "Projects" },
    { href: "/dashboard/notifications", icon: Bell, label: "Notifications" },
  ]

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 md:left-4 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 z-50">
      <div className="flex md:flex-col items-center gap-2 p-3 rounded-2xl bg-background/80 backdrop-blur-lg border border-border shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            (item.href === "/dashboard" && pathname === "/dashboard") ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href)) ||
            (item.label === "Projects" && pathname.startsWith("/projects"))

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
              <Icon className="h-5 w-5 relative z-10" />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
