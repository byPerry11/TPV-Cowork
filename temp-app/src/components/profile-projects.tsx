"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Folder } from "lucide-react"

interface ProjectParticipation {
    id: string
    title: string
    role: string
    status: string
}

export function ProfileProjects({ userId }: { userId: string }) {
    const [projects, setProjects] = useState<ProjectParticipation[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProjects = async () => {
            const { data } = await supabase
                .from('project_members')
                .select(`
                    role,
                    project:projects (
                        id,
                        title,
                        status
                    )
                `)
                .eq('user_id', userId)
                .eq('status', 'active')

            if (data) {
                // Filter out projects that RLS hid (null project relation)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mapped = data
                    .filter((d: any) => d.project) // <--- Safety check
                    .map((d: any) => ({
                        id: d.project.id,
                        title: d.project.title,
                        status: d.project.status,
                        role: d.role
                    }))
                setProjects(mapped)
            }
            setLoading(false)
        }
        fetchProjects()
    }, [userId])

    if (loading) return <div className="h-20 flex items-center justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <Card>
            <CardHeader>
                <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
                {projects.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Not part of any active projects.</p>
                ) : (
                    <div className="space-y-3">
                        {projects.map(proj => (
                            <div key={proj.id} className="flex items-center justify-between p-3 rounded-md border bg-card">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                                        <Folder className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{proj.title}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{proj.status}</p>
                                    </div>
                                </div>
                                <Badge variant={proj.role === 'admin' ? 'default' : 'secondary'}>
                                    {proj.role}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
