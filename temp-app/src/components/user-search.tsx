"use client"

import { useState, useEffect } from "react"
import { Search, UserPlus, UserCheck, Loader2, User } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"

interface Profile {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
}

export function UserSearch() {
    const [userId, setUserId] = useState<string | null>(null)
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<Profile[]>([])
    const [loading, setLoading] = useState(false)
    const [requestStatus, setRequestStatus] = useState<Record<string, string>>({})

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setUserId(user.id)
        }
        getUser()
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                performSearch(query)
            } else {
                setResults([])
            }
        }, 500) // 500ms debounce

        return () => clearTimeout(timer)
    }, [query])

    const performSearch = async (value: string) => {
        setLoading(true)
        try {
            const cleanQuery = value.startsWith('@') ? value.slice(1) : value

            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url')
                .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)
                .neq('id', userId)
                .limit(5)

            if (error) throw error
            setResults(data || [])
            
            // Check status for these users
            if (data && data.length > 0 && userId) {
                const { data: statusData } = await supabase
                    .from('friend_requests')
                    .select('receiver_id, status')
                    .eq('sender_id', userId)
                    .in('receiver_id', data.map((u: any) => u.id))
                
                const statusMap: Record<string, string> = {}
                statusData?.forEach((r: any) => {
                    statusMap[r.receiver_id] = r.status
                })
                
                setRequestStatus(statusMap)
            }

        } catch (error) {
            console.error("Search error", error)
        } finally {
            setLoading(false)
        }
    }

    const sendRequest = async (receiverId: string) => {
        if (!userId) return
        try {
            const { error } = await supabase
                .from('friend_requests')
                .insert({
                    sender_id: userId,
                    receiver_id: receiverId
                })
            
            if (error) throw error
            toast.success("Friend request sent!")
            setRequestStatus(prev => ({ ...prev, [receiverId]: 'pending' }))
        } catch (error: any) {
            if (error.code === '23505') {
                toast.error("Request already sent")
            } else {
                toast.error("Failed to send request")
            }
        }
    }

    return (
        <div className="relative w-full max-w-sm">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search users..." 
                            className="pl-8"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => setOpen(true)}
                        />
                    </div>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                    <Command>
                        <CommandList>
                            {loading && <CommandItem disabled>Searching...</CommandItem>}
                            {!loading && results.length === 0 && query.length >= 2 && (
                                <div className="py-6 text-center text-sm">No users found.</div>
                            )}
                            {results.length > 0 && (
                                <CommandGroup heading="Users">
                                    {results.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-2 hover:bg-accent rounded-sm">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={user.avatar_url || ""} />
                                                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{user.display_name || user.username}</span>
                                                    <span className="text-xs text-muted-foreground">@{user.username}</span>
                                                </div>
                                            </div>
                                            {requestStatus[user.id] === 'accepted' ? (
                                                <Button size="icon" variant="ghost" disabled className="h-8 w-8 text-green-500">
                                                    <UserCheck className="h-4 w-4" />
                                                </Button>
                                            ) : requestStatus[user.id] === 'pending' ? (
                                                <Button size="icon" variant="ghost" disabled className="h-8 w-8">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                </Button>
                                            ) : (
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => sendRequest(user.id)}>
                                                    <UserPlus className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}
