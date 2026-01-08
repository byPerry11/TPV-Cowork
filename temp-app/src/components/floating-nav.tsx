"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, User, Bell, FolderKanban } from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationsPopover } from "@/components/notifications-popover"

export function FloatingNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/dashboard", icon: FolderKanban, label: "Projects" },
  ]

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 md:left-4 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 z-50">
      <div className="flex md:flex-col items-center gap-2 p-3 rounded-2xl bg-background/80 backdrop-blur-lg border border-border shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
            (item.label === "Projects" && pathname.startsWith("/projects"))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200",
                "hover:bg-primary/10 hover:scale-110",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground"
              )}
              title={item.label}
            >
              <Icon className="h-5 w-5" />
              {isActive && (
                <span className="absolute -right-1 -top-1 w-2 h-2 bg-primary rounded-full md:hidden" />
              )}
            </Link>
          )
        })}

        {/* Notifications with Popover */}
        <NotificationsPopover>
          <div
            className={cn(
              "relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200",
              "hover:bg-primary/10 hover:scale-110 text-muted-foreground cursor-pointer"
            )}
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
          </div>
        </NotificationsPopover>
      </div>
    </nav>
  )
}
