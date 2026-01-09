import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Check, X, User } from "lucide-react"
import { toast } from "sonner"
import { UserSearch } from "@/components/user-search"

interface Profile {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
}

interface FriendRequest {
    id: string
    sender_id: string
    receiver_id: string
    status: 'pending' | 'accepted' | 'rejected'
    sender: Profile
    receiver: Profile
}

export function FriendManager({ userId }: { userId: string }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [friends, setFriends] = useState<Profile[]>([])
    const [requests, setRequests] = useState<FriendRequest[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            // 1. Fetch Requests (received) - only IDs first
            const { data: reqData, error: reqError } = await supabase
                .from('friend_requests')
                .select('id, sender_id, receiver_id, status, created_at')
                .eq('receiver_id', userId)
                .eq('status', 'pending')

            if (reqError) throw reqError

            // 2. Fetch sender profiles separately
            if (reqData && reqData.length > 0) {
                const senderIds = reqData.map(r => r.sender_id)
                const { data: senderProfiles } = await supabase
                    .from('profiles')
                    .select('id, username, display_name, avatar_url')
                    .in('id', senderIds)

                // Merge profiles with requests
                const requestsWithProfiles = reqData.map(req => ({
                    ...req,
                    sender: senderProfiles?.find(p => p.id === req.sender_id) || {
                        id: req.sender_id,
                        username: 'Unknown',
                        display_name: null,
                        avatar_url: null
                    },
                    receiver: { id: userId, username: null, display_name: null, avatar_url: null }
                }))
                setRequests(requestsWithProfiles as any)
            } else {
                setRequests([])
            }

            // 3. Fetch Friends (accepted requests) - only IDs first
            const { data: friendData, error: friendError } = await supabase
                .from('friend_requests')
                .select('id, sender_id, receiver_id, status')
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
                .eq('status', 'accepted')

            if (friendError) throw friendError

            // 4. Get unique friend IDs (exclude current user)
            const friendIds = new Set<string>()
            friendData?.forEach((f: any) => {
                if (f.sender_id === userId) {
                    friendIds.add(f.receiver_id)
                } else {
                    friendIds.add(f.sender_id)
                }
            })

            // 5. Fetch friend profiles
            if (friendIds.size > 0) {
                const { data: friendProfiles } = await supabase
                    .from('profiles')
                    .select('id, username, display_name, avatar_url')
                    .in('id', Array.from(friendIds))

                setFriends(friendProfiles || [])
            } else {
                setFriends([])
            }

        } catch (error: any) {
            console.error("Error fetching friends", error)
            toast.error("Failed to load friends")
        } finally {
            setLoading(false)
        }
    }, [userId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleResponse = async (requestId: string, status: 'accepted' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('friend_requests')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', requestId)

            if (error) throw error
            toast.success(`Request ${status}`)
            fetchData() // Reload lists
        } catch (error: any) {
            toast.error("Failed to update request")
        }
    }

    return (
        <div className="space-y-6">
            {/* Search Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Find Friends</CardTitle>
                    <CardDescription>Search for users by username or display name to connect.</CardDescription>
                </CardHeader>
                <CardContent>
                    <UserSearch />
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Pending Requests */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Pending Requests
                            {requests.length > 0 && <Badge variant="destructive">{requests.length}</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading && requests.length === 0 ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                        ) : requests.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No pending requests.</p>
                        ) : (
                            requests.map((req) => (
                                <div key={req.id} className="flex items-center justify-between p-2 border rounded-md">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={req.sender.avatar_url || ""} />
                                            <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{req.sender.display_name || req.sender.username}</span>
                                            <span className="text-xs text-muted-foreground">@{req.sender.username}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleResponse(req.id, 'accepted')}>
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleResponse(req.id, 'rejected')}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Friends List */}
                <Card>
                    <CardHeader>
                        <CardTitle>My Friends</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading && friends.length === 0 ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                        ) : friends.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No friends added yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {friends.map((friend) => (
                                    <div key={friend.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md">
                                        <Avatar>
                                            <AvatarImage src={friend.avatar_url || ""} />
                                            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{friend.display_name || friend.username}</span>
                                            <span className="text-xs text-muted-foreground">@{friend.username}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
