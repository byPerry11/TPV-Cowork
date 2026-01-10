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
            // 1. Fetch memberships (existing logic)
            const { data: memberData } = await supabase
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

            // 2. Fetch owned projects explicitly
            const { data: ownedData } = await supabase
                .from('projects')
                .select('id, title, status')
                .eq('owner_id', userId)

            let combined: ProjectParticipation[] = []

            // Process memberships
            if (memberData) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fromMembers = memberData
                    .filter((d: any) => d.project)
                    .map((d: any) => ({
                        id: d.project.id,
                        title: d.project.title,
                        status: d.project.status,
                        role: d.role
                    }))
                combined = [...combined, ...fromMembers]
            }

            // Process owned projects
            if (ownedData) {
                const fromOwned = ownedData.map(p => ({
                    id: p.id,
                    title: p.title,
                    status: p.status,
                    role: 'admin' // Owner is always admin
                }))
                combined = [...combined, ...fromOwned]
            }

            // Deduplicate by ID
            const unique = Array.from(new Map(combined.map(item => [item.id, item])).values())

            setProjects(unique)
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
