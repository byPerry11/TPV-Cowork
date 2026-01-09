"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, UserPlus, Users } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export interface UserOption {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    isFriend: boolean
}

interface UserMultiSelectProps {
    selectedUsers: string[]
    onSelectionChange: (users: string[]) => void
}

export function UserMultiSelect({ selectedUsers, onSelectionChange }: UserMultiSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [users, setUsers] = React.useState<UserOption[]>([])
    const [inputValue, setInputValue] = React.useState("")
    const [loading, setLoading] = React.useState(false)

    // Load initial friends list
    React.useEffect(() => {
        fetchFriends()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Search users when input changes
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (inputValue.length > 2) {
                searchUsers(inputValue)
            } else if (inputValue.length === 0) {
                fetchFriends()
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [inputValue])

    const fetchFriends = async () => {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Fetch accepted friend requests
        const { data: friendsData } = await supabase
            .from("friend_requests")
            .select(`
                sender_id,
                receiver_id
            `)
            .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
            .eq("status", "accepted")

        const friendIds = friendsData?.map(f =>
            f.sender_id === session.user.id ? f.receiver_id : f.sender_id
        ) || []

        if (friendIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, username, display_name, avatar_url")
                .in("id", friendIds)

            const formattedFriends = profiles?.map(p => ({
                ...p,
                isFriend: true
            })) || []

            setUsers(formattedFriends)
        } else {
            setUsers([])
        }
        setLoading(false)
    }

    const searchUsers = async (query: string) => {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .ilike("username", `%${query}%`)
            .neq("id", session.user.id) // Exclude self
            .limit(10)

        // Check if results are friends (simple check against current list if we wanted, 
        // but for now we just mark them as false unless they were already loaded as friends? 
        // Actually simpler: just show them. Logic for "isFriend" needs a separate check or just assume search results are mixed.
        // For simplicity, we won't mark 'isFriend' on search results unless we cross-reference.)

        // Let's keep it simple: Search Results don't explicitly show "Friend" badge, 
        // but Friends list does.
        const formattedResults = profiles?.map(p => ({
            ...p,
            isFriend: false // We don't verify friendship again for search results for performance, fine for now.
        })) || []

        setUsers(formattedResults)
        setLoading(false)
    }

    const toggleUser = (userId: string) => {
        const newSelection = selectedUsers.includes(userId)
            ? selectedUsers.filter(id => id !== userId)
            : [...selectedUsers, userId]
        onSelectionChange(newSelection)
    }

    const selectedCount = selectedUsers.length

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto min-h-[40px] px-3 py-2"
                >
                    <div className="flex flex-wrap gap-1">
                        {selectedCount === 0 && <span className="text-muted-foreground">Select members...</span>}
                        {selectedCount > 0 && (
                            <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="mr-1">{selectedCount}</Badge>
                                <span className="text-sm">selected</span>
                            </div>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search username..."
                        value={inputValue}
                        onValueChange={setInputValue}
                    />
                    <CommandList>
                        {loading && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Loading...
                            </div>
                        )}
                        {!loading && users.length === 0 && (
                            <CommandEmpty>No users found.</CommandEmpty>
                        )}
                        <CommandGroup heading={inputValue ? "Search Results" : "Friends"}>
                            {users.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    value={user.username || user.id}
                                    onSelect={() => toggleUser(user.id)}
                                    className="cursor-pointer"
                                    disabled={false}
                                >
                                    <div className="flex items-center gap-2 w-full">
                                        <div className={cn(
                                            "flex items-center justify-center w-4 h-4 border rounded-sm mr-2",
                                            selectedUsers.includes(user.id)
                                                ? "bg-primary border-primary text-primary-foreground"
                                                : "border-primary opacity-50"
                                        )}>
                                            <Check className={cn("h-3 w-3", selectedUsers.includes(user.id) ? "opacity-100" : "opacity-0")} />
                                        </div>

                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={user.avatar_url || undefined} />
                                            <AvatarFallback className="text-[10px]">{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>

                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate text-sm font-medium">{user.display_name || user.username}</span>
                                            {user.display_name && <span className="truncate text-xs text-muted-foreground">@{user.username}</span>}
                                        </div>

                                        {user.isFriend && (
                                            <Badge variant="outline" className="ml-auto text-[10px] h-4 px-1">Friend</Badge>
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {inputValue.length > 0 && (
                            <CommandGroup>
                                <CommandSeparator />
                                <div className="p-2 text-xs text-muted-foreground text-center">
                                    Search global users
                                </div>
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
