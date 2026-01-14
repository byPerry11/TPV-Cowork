"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, PenTool } from "lucide-react" // PenTool como icono para pizarra
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"

export default function ToolsPage() {
    const router = useRouter()

    const handleCreateWhiteboard = async () => {
        try {
            // Get current user session
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) {
                toast.error("You must be logged in to create a whiteboard")
                return
            }

            const { data, error } = await supabase
                .from('whiteboards')
                .insert({ owner_id: session.user.id })
                .select()
                .single()

            if (error) {
                console.error("Error creating whiteboard:", error)
                toast.error("Failed to create whiteboard")
                return
            }

            if (data) {
                router.push(`/tools/whiteboard/${data.id}`)
            }
        } catch (e) {
            console.error("Error creating whiteboard:", e)
            toast.error("Error creating whiteboard")
        }
    }

    const tools = [
        {
            id: "pomodoro",
            title: "Pomodoro Timer",
            description: "Stay focused with the Pomodoro technique.",
            icon: Clock,
            action: () => router.push("/profile"), // Por ahora lleva al perfil donde está el timer, o idealmente mover el timer a /tools/pomodoro
            buttonText: "Open Timer",
            status: "Available"
        },
        {
            id: "whiteboard",
            title: "Collaborative Whiteboard",
            description: "Draw and verify ideas with your team in real-time.",
            icon: PenTool,
            action: handleCreateWhiteboard,
            buttonText: "Create Whiteboard",
            status: "Available"
        }
    ]

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-background p-4 md:p-8">
            <div className="max-w-5xl mx-auto w-full space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
                    <p className="text-muted-foreground mt-2">Productivity and collaboration tools for your team.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tools.map((tool) => {
                        const Icon = tool.icon
                        return (
                            <Card key={tool.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                    <CardTitle className="text-xl font-bold">
                                        {tool.title}
                                    </CardTitle>
                                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                                        <Icon className="h-6 w-6" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <CardDescription className="text-base">
                                        {tool.description}
                                    </CardDescription>
                                    <Button
                                        className="w-full"
                                        onClick={tool.action}
                                        disabled={tool.status === "In Development"}
                                        variant={tool.status === "In Development" ? "secondary" : "default"}
                                    >
                                        {tool.buttonText}
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
