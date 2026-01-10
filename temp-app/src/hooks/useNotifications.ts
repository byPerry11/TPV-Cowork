"use client"

import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"

export interface FriendRequest {
    id: string
    sender: {
        username: string
        display_name: string | null
        avatar_url: string | null
    }
    created_at: string
}

export interface ProjectInvitation {
    project_id: string
    user_id: string
    role: string
    created_at: string
    project: {
        title: string
        owner: {
            display_name: string | null
            username: string
        }
    }
}

export interface RejectedCheckpoint {
    id: string
    title: string
    rejection_reason: string | null
    rating: number
    project: {
        id: string
        title: string
    }
}

export function useNotifications() {
    const [loading, setLoading] = useState(true)
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
    const [projectInvites, setProjectInvites] = useState<ProjectInvitation[]>([])
    const [rejectedCheckpoints, setRejectedCheckpoints] = useState<RejectedCheckpoint[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    const fetchNotifications = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Friend Requests
            const { data: frData } = await supabase
                .from('friend_requests')
                .select(`
                    id,
                    created_at,
                    sender:sender_id(username, display_name, avatar_url)
                `)
                .eq('receiver_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setFriendRequests(frData as any || [])

            // 2. Project Invites
            const { data: piData, error: piError } = await supabase
                .from('project_members')
                .select(`
                    project_id,
                    user_id,
                    role,
                    created_at,
                    project:project_id(
                        title,
                        owner:owner_id(display_name, username)
                    )
                `)
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })

            if (piError) console.error("Error fetching invites", piError)

            // Filter out invites where project is null (RLS restricted or deleted)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const validInvites = (piData as any || []).filter((inv: any) => inv.project)
            setProjectInvites(validInvites)

            // 3. Rejected Checkpoints
            // First get project IDs where user is a member
            const { data: userProjects } = await supabase
                .from('project_members')
                .select('project_id')
                .eq('user_id', user.id)

            const projectIds = userProjects?.map(pm => pm.project_id) || []

            if (projectIds.length > 0) {
                const { data: rcData } = await supabase
                    .from('checkpoints')
                    .select(`
                        id,
                        title,
                        rejection_reason,
                        rating,
                        project:project_id(id, title)
                    `)
                    .eq('is_completed', false)
                    .not('rejection_reason', 'is', null)
                    .in('project_id', projectIds)

                // Filter out checkpoints where project is null
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const validCheckpoints = (rcData as any || []).filter((cp: any) => cp.project)
                setRejectedCheckpoints(validCheckpoints)
            } else {
                setRejectedCheckpoints([])
            }

            // Update counts
            const total = (frData?.length || 0) + (piData?.length || 0) + (rejectedCheckpoints.length)
            setUnreadCount(total)

        } catch (error) {
            console.error("Error fetching notifications", error)
            toast.error("Failed to load notifications")
        } finally {
            setLoading(false)
        }
    }, [rejectedCheckpoints.length])

    // Initial fetch
    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])


    // Handlers
    const handleFriendResponse = async (id: string, accept: boolean) => {
        const status = accept ? 'accepted' : 'rejected'
        const { error } = await supabase.from('friend_requests').update({ status }).eq('id', id)

        if (error) {
            toast.error("Failed to update request")
            return
        }

        toast.success(accept ? "Friend request accepted" : "Friend request declined")
        fetchNotifications() // Refresh list
    }

    const handleProjectInvitation = async (projectId: string, accept: boolean) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        if (accept) {
            const { error } = await supabase
                .from("project_members")
                .update({ status: "active" })
                .eq("project_id", projectId)
                .eq("user_id", user.id)

            if (error) {
                toast.error("Failed to accept invitation")
                return
            }
            toast.success("Joined project successfully")
        } else {
            // Check if we should delete or mark rejected. Deletion allows re-invite easily.
            const { error } = await supabase
                .from("project_members")
                .delete()
                .eq("project_id", projectId)
                .eq("user_id", user.id)

            if (error) {
                toast.error("Failed to decline invitation")
                return
            }
            toast.success("Invitation declined")
        }
        fetchNotifications()
    }

    return {
        loading,
        unreadCount,
        friendRequests,
        projectInvites,
        rejectedCheckpoints,
        refresh: fetchNotifications,
        handleFriendResponse,
        handleProjectInvitation
    }
}
