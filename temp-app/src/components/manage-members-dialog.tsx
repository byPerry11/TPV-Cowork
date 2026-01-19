"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, UserPlus, Trash2, Shield, User } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserMultiSelect } from "@/components/user-multi-select"
import { inviteMemberToProject, removeMemberFromProject } from "@/app/actions/members"
import { supabase } from "@/lib/supabaseClient"

const memberSchema = z.object({
    username: z.string().min(3, "Select a user to add"),
    role: z.enum(["admin", "manager", "member"]),
})

interface ManageMembersDialogProps {
    projectId: string
}

interface Member {
    user_id: string
    role: string
    joined_at: string
    profiles: {
        username: string | null
        display_name: string | null
    }
}

export function ManageMembersDialog({ projectId }: ManageMembersDialogProps) {
    const [open, setOpen] = useState(false)
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(false)
    const [adding, setAdding] = useState(false)
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

    const form = useForm<z.infer<typeof memberSchema>>({
        resolver: zodResolver(memberSchema),
        defaultValues: {
            username: "",
            role: "member",
        },
    })

    const fetchMembers = async () => {
        setLoading(true)

        // 1. Fetch project members
        const { data: membersData, error: membersError } = await supabase
            .from('project_members')
            .select('user_id, role, joined_at')
            .eq('project_id', projectId)

        if (membersError) {
            toast.error("Failed to load members")
            console.error(membersError)
            setLoading(false)
            return
        }

        const memberUserIds = membersData.map(m => m.user_id)

        if (memberUserIds.length === 0) {
            setMembers([])
            setLoading(false)
            return
        }

        // 2. Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, display_name')
            .in('id', memberUserIds)

        if (profilesError) {
            console.error("Error fetching profiles for members", profilesError)
        }

        // 3. Combine data
        const combinedMembers = membersData.map(member => {
            const profile = profilesData?.find(p => p.id === member.user_id)
            return {
                ...member,
                profiles: profile ? {
                    username: profile.username,
                    display_name: profile.display_name
                } : { username: 'Unknown', display_name: 'Unknown User' }
            }
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMembers(combinedMembers as any)
        setLoading(false)
    }

    useEffect(() => {
        if (open) {
            fetchMembers()
        }
    }, [open, projectId])

    async function onSubmit(values: z.infer<typeof memberSchema>) {
        setAdding(true)
        try {
            if (!selectedUserId) {
                toast.error('Selecciona un usuario')
                return
            }

            // Check if already member
            const existing = members.find(m => m.user_id === selectedUserId)
            if (existing) {
                toast.error('El usuario ya es miembro')
                return
            }

            const result = await inviteMemberToProject({
                project_id: projectId,
                user_id: selectedUserId,
                role: values.role,
            })

            if (!result.success) {
                toast.error('Error al invitar miembro', {
                    description: result.error,
                })
                return
            }

            toast.success('Invitación enviada correctamente')
            form.reset()
            setSelectedUserId(null)
            fetchMembers()
        } catch (error) {
            console.error('Unexpected error:', error)
            toast.error('Error inesperado')
        } finally {
            setAdding(false)
        }
    }

    const removeMember = async (userId: string) => {
        try {
            const result = await removeMemberFromProject({
                project_id: projectId,
                user_id: userId,
            })

            if (!result.success) {
                toast.error('Error al remover miembro', {
                    description: result.error,
                })
                return
            }

            toast.success('Miembro removido exitosamente')
            setMembers(prev => prev.filter(m => m.user_id !== userId))
        } catch (error) {
            console.error('Unexpected error:', error)
            toast.error('Error inesperado')
        }
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary">
                    <UserPlus className="h-3.5 w-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Manage Members</DialogTitle>
                    <DialogDescription>
                        Invite users to collaborate on this project.
                    </DialogDescription>
                </DialogHeader>

                {/* Add Member Form */}
                <div className="p-4 bg-muted/50 rounded-lg border">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="username"
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Username</FormLabel>
                                        <div className="flex flex-col gap-2">
                                            <FormControl>
                                                {/* Use UserMultiSelect for searching and selecting users */}
                                                <UserMultiSelect
                                                    selectedUsers={selectedUserId ? [selectedUserId] : []}
                                                    onSelectionChange={(users) => {
                                                        const lastSelected = users[users.length - 1];
                                                        setSelectedUserId(lastSelected || null);
                                                        // Update form field for validation
                                                        if (lastSelected) form.setValue("username", "selected");
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a role" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="member">Member</SelectItem>
                                                <SelectItem value="manager">Manager</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" size="sm" className="w-full" disabled={adding || !selectedUserId}>
                                {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Member
                            </Button>
                        </form>
                    </Form>
                </div>

                {/* Members List */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">Current Members</h4>
                    <ScrollArea className="h-[200px] border rounded-md p-2">
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {members.map((member) => (
                                    <div key={member.user_id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium leading-none">{member.profiles?.display_name || member.profiles?.username}</p>
                                                <p className="text-xs text-muted-foreground">@{member.profiles?.username}</p>
                                                <p className="text-xs text-muted-foreground capitalize flex items-center gap-1 mt-1">
                                                    <Shield className="h-3 w-3" />
                                                    {member.role}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => removeMember(member.user_id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

            </DialogContent>
        </Dialog>
    )
}
