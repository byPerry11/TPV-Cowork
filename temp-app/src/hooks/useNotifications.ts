"use client"

import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { checkAchievementsAndNotify } from "@/lib/achievements"
import { toast } from "sonner"

export interface FriendRequest {
    id: string
    sender_id: string
    created_at: string
    status: 'pending' | 'accepted' | 'rejected'
}

export interface ProjectInvitation {
    project_id: string
    user_id: string
    role: string
    status: 'pending' | 'active' | 'rejected'
    project: {
        title: string
        owner_id: string
    } | null
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

export interface SystemNotification {
    id: string
    type: string
    title: string
    message: string
    is_read: boolean
    created_at: string
}

export function useNotifications() {
    const [loading, setLoading] = useState(true)
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
    const [projectInvites, setProjectInvites] = useState<ProjectInvitation[]>([])
    const [rejectedCheckpoints, setRejectedCheckpoints] = useState<RejectedCheckpoint[]>([])
    const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([])
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
                    status,
                    sender_id
                `)
                .eq('receiver_id', user.id)
                .in('status', ['pending', 'accepted', 'rejected'])
                .order('created_at', { ascending: false })
                .limit(20)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setFriendRequests((frData as any) || [])

            // 2. Project Invites
            const { data: piData, error: piError } = await supabase
                .from('project_members')
                .select(`
                    project_id,
                    user_id,
                    role,
                    status,
                    project:project_id(
                        title,
                        owner_id
                    )
                `)
                .eq('user_id', user.id)
                .in('status', ['pending', 'active', 'rejected'])
                .limit(20)

            if (piError) console.error("Error fetching invites", piError)

            const validInvites = (piData as unknown as ProjectInvitation[]) || []
            setProjectInvites(validInvites)

            // 3. Rejected Checkpoints (Keep as is for now, usually these are "pending" resolution)
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

                // Do NOT filter out checkpoints where project is null
                const validCheckpoints = (rcData as unknown as RejectedCheckpoint[] || [])
                setRejectedCheckpoints(validCheckpoints)
            } else {
                setRejectedCheckpoints([])
            }

            // 4. System Notifications (New Table)
            const { data: sysData } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sysDataTyped = sysData as SystemNotification[] || []
            setSystemNotifications(sysDataTyped)

            // Update counts
            const pendingFR = frData?.filter((fr: { status: string }) => fr.status === 'pending').length || 0
            const pendingPI = validInvites.filter((pi) => pi.status === 'pending').length
            const unreadSys = sysDataTyped.filter((n) => !n.is_read).length
            const total = pendingFR + pendingPI + rejectedCheckpoints.length + unreadSys
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

            // Check and unlock achievements for joining a project
            await checkAchievementsAndNotify(user.id, 'project_joined')
        } else {
            const { error } = await supabase
                .from("project_members")
                .update({ status: "rejected" })
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

    const markAsRead = async (id: string) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id)
        fetchNotifications()
    }

    return {
        loading,
        unreadCount,
        friendRequests,
        projectInvites,
        rejectedCheckpoints,
        systemNotifications,
        refresh: fetchNotifications,
        handleFriendResponse,
        handleProjectInvitation,
        markAsRead
    }
}
