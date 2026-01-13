import { FloatingNav } from "@/components/floating-nav"
import { PomodoroProvider } from "@/contexts/pomodoro-context"
import { MiniPomodoroTimer } from "@/components/mini-pomodoro-timer"

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <PomodoroProvider>
            <FloatingNav />
            <div className="hidden md:block fixed top-6 left-6 z-50">
                <img src="/main-logo.png" alt="COWork" className="h-12 w-auto" />
            </div>
            <div className="md:pl-24 w-full">
                {children}
            </div>
            <MiniPomodoroTimer />
        </PomodoroProvider>
    )
}
