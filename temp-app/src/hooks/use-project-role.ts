"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export function useProjectRole(projectId: string) {
    const [role, setRole] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchRole = async () => {
             if (!projectId) return

             try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setLoading(false)
                    return
                }

                // Check project_members
                const { data, error } = await supabase
                    .from('project_members')
                    .select('role')
                    .eq('project_id', projectId)
                    .eq('user_id', user.id)
                    .eq('status', 'active') // Only active members
                    .maybeSingle()
                
                if (data) {
                    setRole(data.role)
                } else {
                    // Check if owner? Assuming owner is in project_members as admin.
                    // If not, we might need to check projects table owner_id.
                    // For now assuming project creator adds themselves to members list.
                }

             } catch (error) {
                 console.error("Error fetching role", error)
             } finally {
                 setLoading(false)
             }
        }

        fetchRole()
    }, [projectId])

    return { role, loading }
}
